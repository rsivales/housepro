"use client";
/* eslint-disable @next/next/no-img-element -- real listing thumbnails use dynamic public URLs */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Building2,
  Plus,
  Search,
  Copy,
  Pencil,
  ChevronDown,
  RefreshCw,
  X,
  ArrowDownRight,
} from "lucide-react";
import {
  STATE_LABEL,
  operationalState,
  daysSince,
  type PortfolioItem,
  type PortfolioReport,
} from "@/lib/portfolio/types";
import { docStatus, docLabel } from "@/lib/imovel/model";
import { NotifyMissingButton } from "@/components/admin/notify-missing-button";
import { DuplicateDialog } from "./duplicate-dialog";
const euro = (v: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
const date = (v: string) => new Date(v).toLocaleDateString("pt-PT");
const control = "min-h-11 rounded-xl border bg-background px-3 text-sm";
const stateClass = (s: string) =>
  s === "activo"
    ? "bg-emerald-500/10 text-emerald-700"
    : s === "pendente"
      ? "bg-amber-500/15 text-amber-800"
      : s === "rejeitado"
        ? "bg-destructive/10 text-destructive"
        : "bg-secondary text-muted-foreground";
function missing(p: PortfolioItem) {
  return docStatus(
    [...new Set([...(p.documentKinds ?? []), ...p.documents])],
    p.sellerType === "empresa",
    p.licenseEndorsed ? ["licenca_utilizacao"] : [],
  );
}
function actionable(p: PortfolioItem, action: string) {
  if (["approve", "reject"].includes(action))
    return p.canApprove && ["pendente", "rejeitado"].includes(p.approval);
  if (!p.canEdit) return false;
  if (action === "submit")
    return p.approval !== "aprovado" && p.approval !== "pendente";
  if (action === "activate")
    return (
      p.approval === "aprovado" &&
      p.listingState !== "activo" &&
      !["vendido", "arrendado", "cpcv"].includes(p.status)
    );
  return action === "deactivate" && p.listingState !== "inactivo";
}
export function PropertyPortfolio({
  initialScope = "mine",
  initialState = "",
  embedded = false,
}: {
  initialScope?: "mine" | "agency";
  initialState?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [scope, setScope] = useState(initialScope),
    [report, setReport] = useState<PortfolioReport | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [q, setQ] = useState(""),
    [state, setState] = useState(initialState),
    [agency, setAgency] = useState(""),
    [agent, setAgent] = useState(""),
    [development, setDevelopment] = useState(""),
    [sort, setSort] = useState("recent"),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(50),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [duplicate, setDuplicate] = useState<PortfolioItem | null>(null),
    [details, setDetails] = useState<PortfolioItem | null>(null),
    [decision, setDecision] = useState<{
      ids: string[];
      action: string;
      label: string;
    } | null>(null),
    [reason, setReason] = useState("");
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/properties/portfolio?scope=${scope}`, {
        cache: "no-store",
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      if (version !== loadVersion.current) return;
      setReport(b);
      setSelected((ids) =>
        ids.filter((id) => b.items.some((p: PortfolioItem) => p.id === id)),
      );
    } catch (e) {
      if (version === loadVersion.current)
        setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [scope]);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = useMemo(() => {
    const term = q
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const result = (report?.items ?? []).filter((p) => {
      const text = [
        p.title,
        p.reference,
        p.municipality,
        p.agentName,
        p.agencyName,
        p.developmentName,
        p.unitLabel,
      ]
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return (
        (!term || text.includes(term)) &&
        (!state ||
          (["reservado", "vendido", "arrendado", "cpcv"].includes(state)
            ? p.status === state
            : operationalState(p) === state)) &&
        (!agency || p.agencyId === agency) &&
        (!agent || p.agentId === agent) &&
        (!development || p.developmentName === development)
      );
    });
    return result.sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "views"
          ? b.views - a.views
          : sort === "leads"
            ? b.leads - a.leads
            : sort === "documents"
              ? missing(b).missingCount - missing(a).missingCount
              : sort === "duration"
                ? (daysSince(
                    b.stateSince ?? (b.state === "activo" ? b.listedAt : null),
                  ) ?? -1) -
                  (daysSince(
                    a.stateSince ?? (a.state === "activo" ? a.listedAt : null),
                  ) ?? -1)
                : 0,
    );
  }, [report, q, state, agency, agent, development, sort]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize)),
    currentPage = Math.min(page, totalPages),
    visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedItems = (report?.items ?? []).filter((p) =>
    selected.includes(p.id),
  );
  function filter(change: () => void) {
    change();
    setPage(1);
    setSelected([]);
  }
  async function action(ids: string[], name: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/properties/portfolio", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids,
          action: name,
          reason: reason || undefined,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setDecision(null);
      setReason("");
      setSelected([]);
      setNotice(
        `${b.count} ${b.count === 1 ? "imóvel atualizado" : "imóveis atualizados"}.`,
      );
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusy(false);
    }
  }
  function ask(ids: string[], name: string, label: string) {
    setReason("");
    setDecision({ ids, action: name, label });
  }
  async function created(items: { id: string; reference: string }[]) {
    setDuplicate(null);
    setNotice(
      `${items.length} ${items.length === 1 ? "rascunho criado" : "rascunhos criados"}. Nenhum foi publicado.`,
    );
    await load();
    router.refresh();
    if (items.length === 1) router.push(`/app/imovel/${items[0].id}/editar`);
  }
  const write = report && !report.readOnly;
  return (
    <div className={embedded ? "" : "mx-auto max-w-[1600px] px-4 py-7 sm:px-7"}>
      {!embedded && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
              Helix · Portefólio
            </p>
            <h1 className="mt-2 flex items-center gap-2 font-display text-3xl">
              <Building2 className="size-7 text-primary" />
              Gestão de imóveis
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Toda a carteira num só lugar. Publicação, documentação e
              resultados.
            </p>
          </div>
          <Link
            href="/app/imovel/novo"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" />
            Novo imóvel
          </Link>
        </div>
      )}
      {report && (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => filter(() => setScope("mine"))}
              aria-pressed={scope === "mine"}
              className={`${control} ${scope === "mine" ? "bg-primary text-primary-foreground" : ""}`}
            >
              Os meus imóveis
            </button>
            {report.capabilities.viewAgency && (
              <button
                onClick={() => filter(() => setScope("agency"))}
                aria-pressed={scope === "agency"}
                className={`${control} ${scope === "agency" ? "bg-primary text-primary-foreground" : ""}`}
              >
                {report.capabilities.global
                  ? "Todas as agências"
                  : "A minha agência"}
              </button>
            )}
            <span className="flex-1" />
            <button
              aria-label="Atualizar portefólio"
              onClick={() => {
                void load();
              }}
              className={`${control} inline-flex items-center gap-2`}
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: "Imóveis na carteira",
                value: report.items.length,
                s: "",
              },
              {
                label: "Ativos",
                value: report.items.filter(
                  (p) => operationalState(p) === "activo",
                ).length,
                s: "activo",
              },
              {
                label: "A aguardar aprovação",
                value: report.items.filter((p) => p.approval === "pendente")
                  .length,
                s: "pendente",
              },
              {
                label: "Inativos",
                value: report.items.filter(
                  (p) => operationalState(p) === "inactivo",
                ).length,
                s: "inactivo",
              },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => filter(() => setState(c.s))}
                className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-secondary"
              >
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {c.value}
                </p>
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="relative min-w-52 flex-1">
              <span className="sr-only">Pesquisar imóveis</span>
              <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => filter(() => setQ(e.target.value))}
                placeholder="Referência, imóvel, fração, consultor…"
                className={`${control} w-full pl-9`}
              />
            </label>
            <select
              aria-label="Estado"
              value={state}
              onChange={(e) => filter(() => setState(e.target.value))}
              className={control}
            >
              <option value="">Todos os estados</option>
              {Object.entries(STATE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {scope === "agency" && report.capabilities.global && (
              <select
                aria-label="Agência"
                className={control}
                value={agency}
                onChange={(e) => filter(() => setAgency(e.target.value))}
              >
                <option value="">Todas as agências</option>
                {[
                  ...new Map(
                    report.items.map((p) => [p.agencyId, p.agencyName]),
                  ).entries(),
                ].map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            {scope === "agency" && (
              <select
                aria-label="Consultor"
                className={control}
                value={agent}
                onChange={(e) => filter(() => setAgent(e.target.value))}
              >
                <option value="">Todos os consultores</option>
                {[
                  ...new Map(
                    report.items.map((p) => [p.agentId, p.agentName]),
                  ).entries(),
                ].map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Empreendimento"
              className={control}
              value={development}
              onChange={(e) => filter(() => setDevelopment(e.target.value))}
            >
              <option value="">Todos os empreendimentos</option>
              {[
                ...new Set(
                  report.items
                    .map((p) => p.developmentName)
                    .filter((v): v is string => Boolean(v)),
                ),
              ]
                .sort()
                .map((name) => (
                  <option key={name}>{name}</option>
                ))}
            </select>
            <select
              aria-label="Ordenação"
              className={control}
              value={sort}
              onChange={(e) => filter(() => setSort(e.target.value))}
            >
              <option value="recent">Mais recentes</option>
              <option value="price">Preço crescente</option>
              <option value="views">Mais visualizações</option>
              <option value="leads">Mais contactos</option>
              <option value="duration">Há mais tempo no estado</option>
              <option value="documents">Mais documentos em falta</option>
            </select>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {rows.length} resultados · {selected.length} selecionados
            </span>
            <span>
              Visualizações e cliques registados desde{" "}
              {date(report.trackingSince)} · contactos = pedidos recebidos
            </span>
          </div>
          {report.readOnly && (
            <p className="mb-3 rounded-lg bg-secondary p-3 text-sm">
              Modo de supervisão: apenas leitura.
            </p>
          )}
          {selected.length > 0 && write && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-secondary p-3">
              <strong className="mr-2 text-sm">
                {selected.length} selecionados
              </strong>
              {[
                ["approve", "Aprovar"],
                ["reject", "Rejeitar"],
                ["submit", "Enviar para revisão"],
                ["activate", "Ativar"],
                ["deactivate", "Inativar"],
              ].map(([a, label]) => (
                <button
                  key={a}
                  disabled={
                    busy ||
                    selectedItems.length > 100 ||
                    !selectedItems.every((p) => actionable(p, a))
                  }
                  onClick={() => ask(selected, a, label)}
                  className="min-h-10 rounded-lg border bg-background px-3 text-xs font-semibold disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setSelected([])}
                className="min-h-10 px-2 text-xs underline"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}
      {report && (
        <div className="overflow-hidden rounded-xl border bg-card md:hidden">
          {visible.map((p) => {
            const docs = missing(p);
            const elapsed = daysSince(p.stateSince);
            const age = daysSince(p.listedAt);
            const drop = p.priceDrops[0];
            return (
              <article key={p.id} className="border-b p-3 last:border-0">
                <div className="flex items-start gap-3">
                  {write && (
                    <input
                      type="checkbox"
                      className="mt-5"
                      aria-label={`Selecionar ${p.reference} no telemóvel`}
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, p.id]
                            : ids.filter((id) => id !== p.id),
                        )
                      }
                    />
                  )}
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {p.image ? (
                      <img
                        src={p.image}
                        loading="lazy"
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Building2 className="mx-auto mt-4 size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={
                        p.canEdit && write
                          ? `/app/imovel/${p.id}/editar`
                          : `/imovel/${p.id}`
                      }
                      className="block truncate text-sm font-semibold"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                      <span>
                        {p.reference} · {p.municipality}
                      </span>
                      <strong className="text-xs text-foreground">
                        {euro(p.price)}
                      </strong>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${stateClass(operationalState(p))}`}
                      >
                        {STATE_LABEL[operationalState(p)] || p.state}
                      </span>
                      {["reservado", "vendido", "arrendado", "cpcv"].includes(p.status) && (
                        <span className="text-[10px] text-muted-foreground">
                          {STATE_LABEL[p.status]}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {elapsed != null
                          ? `${elapsed} dias`
                          : operationalState(p) === "activo" && age != null
                            ? `Anúncio há ${age} dias`
                            : "Data histórica não registada"}
                      </span>
                    </div>
                  </div>
                </div>
                {scope === "agency" && (
                  <p className="mt-2 truncate text-[10px] text-muted-foreground">
                    {p.agencyName} · {p.agentName}
                  </p>
                )}
                {(p.developmentName || p.unitLabel) && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    {p.developmentName} {p.unitLabel ? `· ${p.unitLabel}` : ""}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span>{p.views} visualizações</span>
                  <span>
                    {p.leads} pedidos · {p.contactClicks} interações
                  </span>
                  <button
                    onClick={() => setDetails(p)}
                    className={`min-h-8 underline ${docs.missingCount ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {docs.missingCount} documentos em falta
                  </button>
                  {drop && (
                    <button
                      onClick={() => setDetails(p)}
                      className="min-h-8 text-emerald-700"
                    >
                      ↓ {euro(drop.from - drop.to)} · {date(drop.at)}
                    </button>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <PortfolioActions
                    item={p}
                    readOnly={!write}
                    busy={busy}
                    onDuplicate={() => setDuplicate(p)}
                    onAction={(a, label) => ask([p.id], a, label)}
                  />
                </div>
              </article>
            );
          })}
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Não há imóveis para estes filtros.
            </p>
          )}
        </div>
      )}
      {loading && !report ? (
        <p className="rounded-xl border p-8 text-sm text-muted-foreground">
          A carregar o portefólio real…
        </p>
      ) : (
        report && (
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table
              className={`w-full text-left text-xs ${scope === "agency" ? "min-w-[1280px]" : "min-w-[1080px]"}`}
            >
              <caption className="sr-only">
                Lista de imóveis e estado da publicação
              </caption>
              <thead className="bg-secondary/70 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">
                    {write && (
                      <input
                        type="checkbox"
                        aria-label="Selecionar imóveis desta página"
                        checked={
                          visible.length > 0 &&
                          visible.every((p) => selected.includes(p.id))
                        }
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked
                              ? [
                                  ...new Set([
                                    ...ids,
                                    ...visible.map((p) => p.id),
                                  ]),
                                ]
                              : ids.filter(
                                  (id) => !visible.some((p) => p.id === id),
                                ),
                          )
                        }
                      />
                    )}
                  </th>
                  {[
                    "Imóvel",
                    "Preço",
                    "Estado / tempo",
                    ...(scope === "agency" ? ["Agência / consultor"] : []),
                    "Visualizações",
                    "Contactos",
                    "Baixas de preço",
                    "Documentos",
                    "Ações",
                  ].map((h) => (
                    <th key={h} className="px-3 py-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const docs = missing(p),
                    elapsed = daysSince(p.stateSince),
                    published = daysSince(p.listedAt),
                    drop = p.priceDrops[0];
                  return (
                    <tr
                      key={p.id}
                      className={`border-t align-middle hover:bg-secondary/30 ${selected.includes(p.id) ? "bg-primary/5" : ""}`}
                    >
                      <td className="p-3">
                        {write && (
                          <input
                            aria-label={`Selecionar ${p.reference}`}
                            type="checkbox"
                            checked={selected.includes(p.id)}
                            onChange={(e) =>
                              setSelected((ids) =>
                                e.target.checked
                                  ? [...ids, p.id]
                                  : ids.filter((id) => id !== p.id),
                              )
                            }
                          />
                        )}
                      </td>
                      <td className="min-w-64 max-w-80 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border bg-secondary">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover"
                              />
                            ) : (
                              <Building2 className="mx-auto mt-4 size-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={
                                p.canEdit && write
                                  ? `/app/imovel/${p.id}/editar`
                                  : `/imovel/${p.id}`
                              }
                              className="block truncate text-sm font-semibold hover:text-primary"
                              title={p.title}
                            >
                              {p.title}
                            </Link>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {p.reference} · {p.municipality}
                            </p>
                            {(p.developmentName || p.unitLabel) && (
                              <p
                                className="mt-1 truncate text-[10px] text-muted-foreground"
                                title={p.developmentName || ""}
                              >
                                {p.developmentName}
                                {p.unitLabel ? ` · ${p.unitLabel}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">
                        {euro(p.price)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${stateClass(operationalState(p))}`}
                        >
                          {STATE_LABEL[operationalState(p)] || p.state}
                        </span>
                        {["reservado", "cpcv", "vendido", "arrendado"].includes(
                          p.status,
                        ) && (
                          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                            {STATE_LABEL[p.status]}
                          </span>
                        )}
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          {elapsed != null
                            ? `Há ${elapsed} ${elapsed === 1 ? "dia" : "dias"}`
                            : operationalState(p) === "activo" &&
                                published != null
                              ? `Anúncio há ${published} dias`
                              : "Data histórica não registada"}
                        </p>
                        {p.signaturePending && (
                          <span className="mt-1 block text-[10px] text-amber-700">
                            Signature pendente
                          </span>
                        )}
                      </td>
                      {scope === "agency" && (
                        <td className="max-w-44 px-3 py-3">
                          <p
                            className="truncate font-medium"
                            title={p.agentName}
                          >
                            {p.agentName}
                          </p>
                          <p
                            className="mt-1 truncate text-[10px] text-muted-foreground"
                            title={p.agencyName}
                          >
                            {p.agencyName || "Sem agência"}
                          </p>
                        </td>
                      )}
                      <td className="px-3 py-3 text-center text-sm font-semibold tabular-nums">
                        {p.views}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold tabular-nums">
                          {p.leads} pedidos
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {p.contactClicks} interações
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {drop ? (
                          <button
                            onClick={() => setDetails(p)}
                            className="min-h-11 text-left"
                          >
                            <span className="flex items-center gap-1 font-medium text-emerald-700">
                              <ArrowDownRight className="size-3.5" />
                              {euro(drop.from - drop.to)}
                            </span>
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              {date(drop.at)} · {p.dropCount} redução(ões)
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">
                            Sem reduções
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setDetails(p)}
                          title={docs.missing.map(docLabel).join(", ")}
                          className={`min-h-11 text-left ${docs.missingCount ? "text-amber-700" : "text-emerald-700"}`}
                        >
                          <span className="font-semibold">
                            {docs.missingCount
                              ? `${docs.missingCount} em falta`
                              : "Completo"}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">
                            Ver detalhe
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <PortfolioActions
                          item={p}
                          readOnly={!write}
                          busy={busy}
                          onDuplicate={() => setDuplicate(p)}
                          onAction={(a, label) => ask([p.id], a, label)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Não há imóveis para estes filtros.
              </p>
            )}
          </div>
        )
      )}
      {report && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            Por página{" "}
            <select
              aria-label="Imóveis por página"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className={control}
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              · página {currentPage} de {totalPages}
            </span>
          </label>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className={`${control} disabled:opacity-40`}
            >
              Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className={`${control} disabled:opacity-40`}
            >
              Seguinte
            </button>
          </div>
        </div>
      )}
      {duplicate && report && (
        <DuplicateDialog
          source={duplicate}
          report={report}
          onClose={() => {
            setDuplicate(null);
            void load();
          }}
          onCreated={created}
        />
      )}
      <Dialog.Root
        open={Boolean(decision)}
        onOpenChange={(open) => {
          if (!open && !busy) setDecision(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[min(480px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-6 shadow-xl">
            <Dialog.Title className="font-display text-xl">
              {decision?.label} · {decision?.ids.length} imóvel(is)
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-sm text-muted-foreground">
              {decision?.action === "approve"
                ? "Os anúncios aprovados e ativos ficam visíveis no website."
                : decision?.action === "deactivate"
                  ? "Os imóveis ficam inativos e deixam de aparecer na montra pública."
                  : "A alteração será registada no histórico de cada imóvel."}
            </Dialog.Description>
            {decision?.action === "reject" && (
              <label className="mt-4 block text-sm">
                Motivo da rejeição
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                  className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close disabled={busy} className={control}>
                Cancelar
              </Dialog.Close>
              <button
                disabled={
                  busy ||
                  (decision?.action === "reject" && reason.trim().length < 3)
                }
                onClick={() => {
                  if (decision) void action(decision.ids, decision.action);
                }}
                className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "A guardar…" : "Confirmar"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={Boolean(details)}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[85dvh] w-[min(580px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-background p-6">
            <div className="flex items-start justify-between">
              <Dialog.Title className="font-display text-xl">
                {details?.reference} · Detalhes
              </Dialog.Title>
              <Dialog.Close
                aria-label="Fechar detalhes"
                className="grid size-10 place-items-center"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Documentação e alterações de preço registadas.
            </Dialog.Description>
            {details && (
              <>
                <h3 className="mt-6 font-semibold">Documentos em falta</h3>
                {missing(details).missing.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {missing(details).missing.map((k) => (
                      <li key={k}>{docLabel(k)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-emerald-700">
                    Documentação obrigatória completa.
                  </p>
                )}
                {details.canApprove &&
                  !report?.readOnly &&
                  missing(details).missingCount > 0 && (
                    <div className="mt-3">
                      <NotifyMissingButton propertyId={details.id} />
                    </div>
                  )}
                <h3 className="mt-6 font-semibold">
                  Últimas reduções de preço
                </h3>
                {details.priceDrops.length ? (
                  <ul className="mt-3 space-y-3 text-sm">
                    {details.priceDrops.map((d) => (
                      <li
                        key={d.at}
                        className="flex justify-between gap-4 rounded-lg bg-secondary p-3"
                      >
                        <span>
                          {euro(d.from)} → {euro(d.to)}
                        </span>
                        <span className="text-muted-foreground">
                          {date(d.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sem reduções no histórico disponível.
                  </p>
                )}
                {details.rejectionReason && (
                  <p className="mt-5 rounded-lg bg-destructive/5 p-3 text-sm">
                    Motivo da rejeição: {details.rejectionReason}
                  </p>
                )}
                {details.canEdit && (
                  <Link
                    href={`/app/imovel/${details.id}/editar`}
                    className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Abrir ficha e documentos
                  </Link>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function PortfolioActions({
  item: p,
  readOnly,
  busy,
  onDuplicate,
  onAction,
}: {
  item: PortfolioItem;
  readOnly: boolean;
  busy: boolean;
  onDuplicate: () => void;
  onAction: (action: string, label: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {p.canEdit && !readOnly && (
        <Link
          aria-label={`Editar ${p.reference}`}
          href={`/app/imovel/${p.id}/editar`}
          className="grid size-10 place-items-center rounded-lg border hover:bg-secondary"
        >
          <Pencil className="size-3.5" />
        </Link>
      )}
      {!readOnly && p.canDuplicate && (
        <button
          aria-label={`Duplicar ${p.reference}`}
          onClick={onDuplicate}
          className="grid size-10 place-items-center rounded-lg border hover:bg-secondary"
        >
          <Copy className="size-3.5" />
        </button>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label={`Mais ações de ${p.reference}`}
            className="grid size-10 place-items-center rounded-lg border"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={5}
            className="z-[70] min-w-44 rounded-lg border bg-background p-1 text-xs shadow-lg"
          >
            <DropdownMenu.Item asChild>
              <Link
                href={`/imovel/${p.id}`}
                className="block min-h-10 rounded px-3 py-3 outline-none focus:bg-secondary"
              >
                Ver ficha
              </Link>
            </DropdownMenu.Item>
            {!readOnly &&
              [
                ["submit", "Enviar para revisão"],
                ["approve", "Aprovar"],
                ["reject", "Rejeitar"],
                ["activate", "Ativar"],
                ["deactivate", "Inativar"],
              ]
                .filter(([a]) => actionable(p, a))
                .map(([a, label]) => (
                  <DropdownMenu.Item
                    key={a}
                    disabled={busy}
                    onSelect={() => onAction(a, label)}
                    className="min-h-10 cursor-pointer rounded px-3 py-3 outline-none focus:bg-secondary data-[disabled]:opacity-40"
                  >
                    {label}
                  </DropdownMenu.Item>
                ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
