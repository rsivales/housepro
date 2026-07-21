"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Eye,
  FileDown,
  Link2,
  Lock,
  Save,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { availableProperties, propertyById } from "@/lib/data/mock";
import { formatCalc, formatEuro, formatPrice } from "@/lib/format";
import {
  FIELDS,
  SECTIONS,
  TYPE_LABEL,
  defaultSections,
  reuniaoById,
  reuniaoTotal,
  runCalc,
  type ExternalProperty,
  type Field,
  type Reuniao,
  type ReuniaoType,
} from "@/lib/reuniao/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function blank(id: string, type: ReuniaoType): Reuniao {
  return {
    id,
    type,
    status: "rascunho",
    clientName: "",
    clientContact: "",
    consultantId: "rui",
    propertyIds: [],
    data: {},
    sections: defaultSections(),
    recommendation: "",
    nextSteps: "",
    internalNotes: "",
    outcome: { resultado: "", objecoes: "", interesse: "", proximaAcao: "" },
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function ReuniaoEditor() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const initial = React.useMemo(() => {
    const demo = reuniaoById(id);
    if (demo) return demo;
    const m = id.match(/^novo-(comprador|vendedor|investidor)$/);
    return blank(id, (m?.[1] as ReuniaoType) ?? "comprador");
  }, [id]);

  const [r, setR] = React.useState<Reuniao>(initial);
  const [saved, setSaved] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [pending, setPending] = React.useState<ExternalProperty | null>(null);
  const [importing, setImporting] = React.useState(false);

  React.useEffect(() => {
    const s = localStorage.getItem(`reuniao:${id}`);
    if (s) {
      try {
        setR(JSON.parse(s));
      } catch {
        /* ignore */
      }
    }
  }, [id]);

  const propsTotal = reuniaoTotal(r);
  const calc = React.useMemo(() => runCalc(r, propsTotal), [r, propsTotal]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? availableProperties.filter((p) =>
        `${p.title} ${p.parish} ${p.municipality} ${p.reference}`
          .toLowerCase()
          .includes(q)
      )
    : availableProperties;

  async function addByLink() {
    const url = linkUrl.trim();
    if (!url) return;
    // Link interno → resolve para o imóvel do catálogo.
    try {
      const u = new URL(url, window.location.origin);
      const m = u.pathname.match(/\/imovel\/([^/?#]+)/);
      if (m && propertyById(m[1])) {
        if (!r.propertyIds.includes(m[1]))
          patch({ propertyIds: [...r.propertyIds, m[1]] });
        setLinkUrl("");
        return;
      }
    } catch {
      /* não é URL absoluto */
    }
    // Externo → tenta extrair foto/info; sempre editável antes de adicionar.
    setImporting(true);
    let data: { title?: string; image?: string; price?: number } = {};
    try {
      const res = await fetch(`/api/importar-imovel?url=${encodeURIComponent(url)}`);
      if (res.ok) data = await res.json();
    } catch {
      /* egress bloqueado — preenchimento manual */
    }
    setImporting(false);
    setPending({
      id: `ext-${Date.now()}`,
      url,
      title: data.title ?? "",
      price: data.price ?? 0,
      image: data.image ?? "",
      location: "",
    });
  }

  function confirmExternal() {
    if (!pending) return;
    const ext: ExternalProperty = {
      ...pending,
      image: pending.image || "/properties/dusty-blue.svg",
    };
    patch({ externalProperties: [...(r.externalProperties ?? []), ext] });
    setPending(null);
    setLinkUrl("");
  }

  function patch(p: Partial<Reuniao>) {
    setR((prev) => ({ ...prev, ...p }));
    setSaved(false);
  }
  function setData(key: string, value: string) {
    patch({ data: { ...r.data, [key]: value } });
  }
  function toggleProperty(pid: string) {
    patch({
      propertyIds: r.propertyIds.includes(pid)
        ? r.propertyIds.filter((x) => x !== pid)
        : [...r.propertyIds, pid],
    });
  }

  function save() {
    localStorage.setItem(`reuniao:${id}`, JSON.stringify(r));
    setSaved(true);
  }
  function duplicate() {
    const newId = `reuniao-${Date.now()}`;
    localStorage.setItem(`reuniao:${newId}`, JSON.stringify({ ...r, id: newId }));
    router.push(`/app/reuniao/${newId}`);
  }
  function preview() {
    save();
    window.open(`/reuniao/${id}/apresentacao`, "_blank", "noopener");
  }

  function renderField(f: Field) {
    const v = r.data[f.key] ?? "";
    if (f.kind === "textarea") {
      return (
        <textarea
          id={f.key}
          value={v}
          rows={2}
          onChange={(e) => setData(f.key, e.target.value)}
          className={box}
        />
      );
    }
    if (f.kind === "select") {
      return (
        <select id={f.key} value={v} onChange={(e) => setData(f.key, e.target.value)} className={box}>
          <option value="">—</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    const type = f.kind === "text" ? "text" : "number";
    return (
      <Input
        id={f.key}
        type={type}
        value={v}
        onChange={(e) => setData(f.key, e.target.value)}
        placeholder={f.kind === "money" ? "€" : f.kind === "percent" ? "%" : ""}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/app/reuniao" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Reuniões
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={duplicate}>
              <Copy className="size-4" /> Duplicar
            </Button>
            <Button variant="outline" size="sm" onClick={preview}>
              <Eye className="size-4" /> Pré-visualizar
            </Button>
            <Button variant="outline" size="sm" onClick={preview}>
              <FileDown className="size-4" /> Gerar PDF
            </Button>
            <Button size="sm" onClick={save}>
              <Save className="size-4" /> {saved ? "Guardado" : "Guardar"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <div>
            <p className="text-sm font-medium text-primary">
              Reunião Uau · {TYPE_LABEL[r.type]}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl">
              Apresentação personalizada
            </h1>
          </div>

          {/* Cliente */}
          <Section title="Cliente">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Nome</Label>
                <Input id="clientName" value={r.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientContact">Contacto</Label>
                <Input id="clientContact" value={r.clientContact} onChange={(e) => patch({ clientContact: e.target.value })} />
              </div>
            </div>
          </Section>

          {/* Imóveis */}
          <Section title="Imóveis associados">
            {/* Pesquisa no catálogo (não fica restrito a uma lista curta) */}
            <div className="mb-3 flex items-center gap-2 rounded-md border border-input px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por título, zona ou referência…"
                className="h-9 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">
              {filtered.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                    r.propertyIds.includes(p.id) ? "border-primary bg-primary/5" : "hover:bg-secondary"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={r.propertyIds.includes(p.id)}
                    onChange={() => toggleProperty(p.id)}
                    className="size-4 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.title}</span>
                    <span className="text-muted-foreground">
                      {p.parish}, {p.municipality} · {formatPrice(p)}
                    </span>
                  </span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem resultados.</p>
              )}
            </div>

            {/* Adicionar por link (interno ou de outro portal) */}
            <div className="mt-4 border-t pt-4">
              <Label htmlFor="link">Adicionar por link</Label>
              <p className="mb-1.5 text-xs text-muted-foreground">
                Cole o link de um imóvel — interno ou de outro portal. O sistema
                tenta obter foto e dados automaticamente.
              </p>
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…/imovel/…"
                />
                <Button type="button" variant="outline" onClick={addByLink} disabled={importing}>
                  <Link2 className="size-4" /> {importing ? "A obter…" : "Adicionar"}
                </Button>
              </div>

              {pending && (
                <div className="mt-3 space-y-2 rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Confirme os dados obtidos do link (edite se necessário):
                  </p>
                  <Input
                    placeholder="Título"
                    value={pending.title}
                    onChange={(e) => setPending({ ...pending, title: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Preço €"
                      value={pending.price || ""}
                      onChange={(e) => setPending({ ...pending, price: Number(e.target.value) || 0 })}
                    />
                    <Input
                      placeholder="Localização"
                      value={pending.location}
                      onChange={(e) => setPending({ ...pending, location: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="URL da foto (opcional)"
                    value={pending.image}
                    onChange={(e) => setPending({ ...pending, image: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={confirmExternal}>
                      Adicionar ao dossier
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {(r.externalProperties ?? []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {r.externalProperties!.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/40 p-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        🔗 {e.title || e.url} · {formatEuro(e.price)}
                      </span>
                      <button
                        type="button"
                        aria-label="Remover"
                        onClick={() =>
                          patch({
                            externalProperties: r.externalProperties!.filter((x) => x.id !== e.id),
                          })
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Dados */}
          <Section title="Dados">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS[r.type].map((f) => (
                <div key={f.key} className={cn("space-y-1.5", f.kind === "textarea" && "sm:col-span-2")}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  {renderField(f)}
                </div>
              ))}
            </div>
          </Section>

          {/* Recomendação + próximos passos (visível ao cliente) */}
          <Section title="Recomendação e próximos passos">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rec">Recomendação do consultor</Label>
                <textarea id="rec" rows={2} value={r.recommendation} onChange={(e) => patch({ recommendation: e.target.value })} className={box} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next">Próximos passos</Label>
                <textarea id="next" rows={2} value={r.nextSteps} onChange={(e) => patch({ nextSteps: e.target.value })} className={box} />
              </div>
            </div>
          </Section>

          {/* Notas internas — separadas e nunca no PDF */}
          <div className="rounded-2xl border border-dashed border-warning/60 bg-warning/5 p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lock className="size-4 text-warning" /> Notas internas
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-normal text-foreground">
                Nunca aparece na apresentação / PDF
              </span>
            </p>
            <textarea
              rows={2}
              value={r.internalNotes}
              onChange={(e) => patch({ internalNotes: e.target.value })}
              className={cn(box, "mt-3")}
            />
          </div>

          {/* Resultado da reunião */}
          <Section title="Resultado da reunião">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="res">Resultado</Label>
                <Input id="res" value={r.outcome.resultado} onChange={(e) => patch({ outcome: { ...r.outcome, resultado: e.target.value } })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int">Interesse</Label>
                <select id="int" value={r.outcome.interesse} onChange={(e) => patch({ outcome: { ...r.outcome, interesse: e.target.value as Reuniao["outcome"]["interesse"] } })} className={box}>
                  <option value="">—</option>
                  <option value="alto">Alto</option>
                  <option value="medio">Médio</option>
                  <option value="baixo">Baixo</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obj">Objeções</Label>
                <Input id="obj" value={r.outcome.objecoes} onChange={(e) => patch({ outcome: { ...r.outcome, objecoes: e.target.value } })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prox">Próxima ação</Label>
                <Input id="prox" value={r.outcome.proximaAcao} onChange={(e) => patch({ outcome: { ...r.outcome, proximaAcao: e.target.value } })} />
              </div>
            </div>
          </Section>
        </div>

        {/* Coluna direita: secções + simulação ao vivo */}
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium">Secções na apresentação</p>
            <p className="mt-1 text-xs text-muted-foreground">Escolha o que o cliente vê.</p>
            <div className="mt-3 space-y-2">
              {SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.sections[s.key] ?? true}
                    onChange={() => patch({ sections: { ...r.sections, [s.key]: !(r.sections[s.key] ?? true) } })}
                    className="size-4 accent-primary"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium">Simulação (estimativa)</p>
            <dl className="mt-3 space-y-2 text-sm">
              {calc.lines.map((l) => (
                <div
                  key={l.label}
                  className={cn("flex justify-between gap-3", l.emphasis && "border-t pt-2 font-semibold")}
                >
                  <dt className="text-muted-foreground">{l.label}</dt>
                  <dd>{formatCalc(l.value, l.kind)}</dd>
                </div>
              ))}
            </dl>
            {calc.cenarios && (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Cenários (yield líquida / cash-flow)</p>
                <div className="mt-2 space-y-1 text-sm">
                  {calc.cenarios.map((c) => (
                    <div key={c.nome} className="flex justify-between">
                      <span>{c.nome}</span>
                      <span>
                        {(c.yieldLiquida * 100).toFixed(1)}% · {formatEuro(c.cashFlow)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Valores meramente indicativos. Rever antes de partilhar.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 font-medium">{title}</h2>
      {children}
    </section>
  );
}
