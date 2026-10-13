"use client";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Copy, Layers } from "lucide-react";
import {
  generateUnits,
  preserveUnitEdits,
  validUnits,
  type PortfolioItem,
  type PortfolioReport,
  type UnitDraft,
} from "@/lib/portfolio/types";
const input = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";
export function DuplicateDialog({
  source,
  report,
  onClose,
  onCreated,
}: {
  source: PortfolioItem;
  report: PortfolioReport;
  onClose: () => void;
  onCreated: (items: { id: string; reference: string }[]) => Promise<void>;
}) {
  const [count, setCount] = useState(1),
    [start, setStart] = useState(1),
    [prefix, setPrefix] = useState(""),
    [development, setDevelopment] = useState(source.developmentName || ""),
    [agentId, setAgentId] = useState(
      report.capabilities.editAgency ? source.agentId : report.viewerId,
    ),
    [copyMedia, setCopyMedia] = useState(true),
    [units, setUnits] = useState(() => generateUnits(source, 1, "", 1)),
    [batchId] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const edited = useRef(new Set<string>());
  function patch(
    index: number,
    key: keyof UnitDraft,
    value: string | number | null,
  ) {
    edited.current.add(`${index}:${key}`);
    setUnits((rows) =>
      rows.map((u, i) => (i === index ? { ...u, [key]: value } : u)),
    );
  }
  async function save() {
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/properties/duplicate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceId: source.id,
          batchId,
          units,
          agentId,
          copyMedia,
          developmentName: development,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      await onCreated(b.items);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Falha na ligação. Pode repetir o mesmo pedido sem criar cópias extra; ao fechar, a carteira será atualizada para confirmar o resultado."
          : e instanceof Error
            ? e.message
            : "Falha ao criar. Pode repetir o mesmo pedido sem duplicar o lote.",
      );
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[94dvh] w-[min(1160px,96vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-display text-2xl">
                <Copy className="size-5 text-primary" />
                Duplicar imóvel / criar frações
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                Modelo: {source.reference}. Cada ficha terá referência própria e
                começa em rascunho, sem publicação.
              </Dialog.Description>
            </div>
            <Dialog.Close
              disabled={busy}
              aria-label="Fechar duplicação"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <p className="mt-4 rounded-lg bg-secondary p-3 text-xs leading-5">
            Documentos, contratos, dados do proprietário, aprovações, histórico,
            contactos e estatísticas não são copiados. Confirme as áreas, preços
            e imagens de cada fração antes de a publicar.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-medium">
              Quantidade (1–100)
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="text-xs font-medium">
              Prefixo da fração
              <input
                maxLength={20}
                placeholder="Ex.: A, Bloco B-"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className={input}
              />
            </label>
            <label className="text-xs font-medium">
              Numeração inicial
              <input
                type="number"
                min={1}
                max={99999}
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className={input}
              />
            </label>
            <button
              disabled={
                !Number.isInteger(count) ||
                count < 1 ||
                count > 100 ||
                !Number.isInteger(start) ||
                start < 1 ||
                start > 99999 ||
                busy
              }
              onClick={() => {
                setUnits((previous) =>
                  preserveUnitEdits(
                    generateUnits(source, count, prefix, start),
                    previous,
                    edited.current,
                  ),
                );
                setError("");
              }}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-secondary px-3 text-sm font-semibold disabled:opacity-50"
            >
              <Layers className="size-4" />
              Gerar linhas
            </button>
            <label className="text-xs font-medium sm:col-span-2">
              Empreendimento (opcional)
              <input
                value={development}
                maxLength={150}
                onChange={(e) => setDevelopment(e.target.value)}
                placeholder="Nome comum para agrupar as frações"
                className={input}
              />
            </label>
            <label className="text-xs font-medium sm:col-span-2">
              Consultor responsável
              <select
                value={agentId}
                disabled={!report.capabilities.editAgency}
                onChange={(e) => setAgentId(e.target.value)}
                className={input}
              >
                {report.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyMedia}
              onChange={(e) => setCopyMedia(e.target.checked)}
            />
            Copiar fotografias, vídeo e tour do modelo
          </label>
          <div className="mt-5 max-h-[45dvh] overflow-auto rounded-xl border">
            <table className="w-full min-w-[990px] text-left text-xs">
              <caption className="sr-only">
                Rever as {units.length} fichas antes de criar
              </caption>
              <thead className="sticky top-0 z-10 bg-secondary">
                <tr>
                  {[
                    "Fração",
                    "Título do anúncio",
                    "Tipologia",
                    "Preço (€)",
                    "Área bruta",
                    "Área útil",
                    "Quartos",
                    "WC",
                  ].map((h) => (
                    <th key={h} className="p-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={i} className="border-t">
                    <td className="w-24 p-2">
                      <input
                        aria-label={`Fração ${i + 1}`}
                        value={u.label}
                        maxLength={50}
                        onChange={(e) => patch(i, "label", e.target.value)}
                        className={input}
                      />
                    </td>
                    <td className="min-w-64 p-2">
                      <input
                        aria-label={`Título ${i + 1}`}
                        value={u.title}
                        maxLength={250}
                        onChange={(e) => patch(i, "title", e.target.value)}
                        className={input}
                      />
                    </td>
                    <td className="w-24 p-2">
                      <input
                        aria-label={`Tipologia ${i + 1}`}
                        value={u.typology}
                        maxLength={15}
                        onChange={(e) => patch(i, "typology", e.target.value)}
                        className={input}
                      />
                    </td>
                    {(
                      ["price", "area", "areaUtil", "beds", "baths"] as const
                    ).map((k) => (
                      <td key={k} className="w-28 p-2">
                        <input
                          aria-label={`${k} ${i + 1}`}
                          type="number"
                          min={0}
                          step={k === "beds" || k === "baths" ? 1 : "0.01"}
                          value={u[k] ?? ""}
                          onChange={(e) =>
                            patch(
                              i,
                              k,
                              e.target.value === "" && k === "areaUtil"
                                ? null
                                : Number(e.target.value),
                            )
                          }
                          className={input}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {units.length !== count && (
            <p className="mt-3 text-sm text-amber-700">
              Carregue em “Gerar linhas” para aplicar a nova quantidade.
            </p>
          )}
          {!validUnits(units) && (
            <p className="mt-3 text-sm text-amber-700">
              Confirme os campos e evite códigos de fração repetidos.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              A criação é feita num único lote. Repetir um pedido interrompido
              não cria cópias adicionais.
            </p>
            <button
              onClick={save}
              disabled={busy || units.length !== count || !validUnits(units)}
              className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "A criar o lote…"
                : `Criar ${units.length} ${units.length === 1 ? "rascunho" : "rascunhos"}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
