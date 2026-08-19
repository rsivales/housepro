"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Send,
  Save,
  Mail,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EMAIL_TYPE_LABEL,
  EMAIL_TEMPLATES,
  BLOCK_LABEL,
  MERGE_VARS,
  renderVariables,
  previewContext,
  type EmailCampaign,
  type EmailCampaignType,
  type EmailBlock,
  type EmailBlockType,
  type Segment,
  type EmailStats,
} from "@/lib/data/xcampaigns";
import { CONTACT_TYPE_LABEL, type ContactType } from "@/lib/data/contacts";

const uid = () => `b-${Math.random().toString(36).slice(2, 8)}`;
const EDITABLE: EmailBlockType[] = ["heading", "text", "button"];

export function CampaignStudio({ initial }: { initial: EmailCampaign[] }) {
  const [list, setList] = React.useState<EmailCampaign[]>(initial);
  const [editing, setEditing] = React.useState(false);

  return (
    <div>
      {!editing && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {list.length} campanha{list.length === 1 ? "" : "s"}
          </p>
          <Button size="sm" onClick={() => setEditing(true)}>
            <Plus className="size-4" /> Nova campanha
          </Button>
        </div>
      )}

      {editing ? (
        <Editor
          onDone={(c) => {
            if (c) setList((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
            setEditing(false);
          }}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium leading-tight">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.subject}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {EMAIL_TYPE_LABEL[c.type]}
                </span>
              </div>
              {c.stats && <StatsRow stats={c.stats} />}
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Sem campanhas. Cria a primeira.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatsRow({ stats }: { stats: EmailStats }) {
  const cell = (label: string, value: number) => (
    <div>
      <p className="font-display text-lg leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 sm:grid-cols-6">
      {cell("Enviados", stats.sent)}
      {cell("Entregues", stats.delivered)}
      {cell("Abertos", stats.opened)}
      {cell("Cliques", stats.clicked)}
      {cell("Devoluções", stats.bounced)}
      {cell("Cancelam.", stats.unsubscribed)}
    </div>
  );
}

function Editor({ onDone }: { onDone: (c: EmailCampaign | null) => void }) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<EmailCampaignType>("promocao_imovel");
  const [subject, setSubject] = React.useState("");
  const [blocks, setBlocks] = React.useState<EmailBlock[]>([]);
  const [seg, setSeg] = React.useState<Segment>({});
  const [busy, setBusy] = React.useState<null | "save" | "send">(null);
  const [stats, setStats] = React.useState<EmailStats | null>(null);
  const [recipients, setRecipients] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function applyTemplate(key: string) {
    const t = EMAIL_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setType(t.type);
    setSubject(t.subject);
    setBlocks(t.blocks.map((b) => ({ ...b, id: uid() })));
    if (!name) setName(t.name);
  }

  function addBlock(t: EmailBlockType) {
    setBlocks((prev) => [...prev, { id: uid(), type: t, text: EDITABLE.includes(t) ? "" : undefined }]);
  }
  function move(i: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save(send: boolean) {
    if (!name || !subject) {
      setError("Indica nome e assunto.");
      return;
    }
    setBusy(send ? "send" : "save");
    setError(null);
    try {
      const res = await fetch("/api/xcampaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, type, subject, blocks, segment: seg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível guardar.");
      const campaign = data.campaign as EmailCampaign;

      if (!send) {
        onDone(campaign);
        return;
      }
      const sres = await fetch("/api/xcampaigns/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, subject, segment: seg }),
      });
      const sdata = await sres.json();
      if (!sres.ok) throw new Error(sdata?.error ?? "Falha no envio sandbox.");
      setStats(sdata.stats as EmailStats);
      setRecipients(sdata.recipients as number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {/* Editor */}
      <div className="space-y-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Começar de um modelo</span>
            <select className="input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">— em branco —</option>
              {EMAIL_TEMPLATES.map((t) => (<option key={t.key} value={t.key}>{t.name}</option>))}
            </select>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome interno *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</span>
              <select value={type} onChange={(e) => setType(e.target.value as EmailCampaignType)} className="input">
                {(Object.keys(EMAIL_TYPE_LABEL) as EmailCampaignType[]).map((t) => (
                  <option key={t} value={t}>{EMAIL_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Assunto *</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder="Pode usar variáveis, ex.: Olá {nome}" />
          </label>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Variáveis: {MERGE_VARS.map((v) => `{${v}}`).join(" · ")}
          </p>
        </div>

        {/* Blocos */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(BLOCK_LABEL) as EmailBlockType[]).map((t) => (
              <button key={t} type="button" onClick={() => addBlock(t)} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                + {BLOCK_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {blocks.map((b, i) => (
              <div key={b.id} className="rounded-xl border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{BLOCK_LABEL[b.type]}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Subir" onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-secondary"><ArrowUp className="size-3.5" /></button>
                    <button type="button" aria-label="Descer" onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-secondary"><ArrowDown className="size-3.5" /></button>
                    <button type="button" aria-label="Remover" onClick={() => setBlocks((p) => p.filter((x) => x.id !== b.id))} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                {EDITABLE.includes(b.type) && (
                  <input
                    value={b.text ?? ""}
                    onChange={(e) => setBlocks((p) => p.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x)))}
                    placeholder={b.type === "button" ? "Texto do botão" : "Escreve aqui…"}
                    className="input mt-1"
                  />
                )}
                {b.type === "property" && (
                  <input
                    value={b.propertyRef ?? ""}
                    onChange={(e) => setBlocks((p) => p.map((x) => (x.id === b.id ? { ...x, propertyRef: e.target.value } : x)))}
                    placeholder="Referência do imóvel (ex.: HP-1048)"
                    className="input mt-1"
                  />
                )}
              </div>
            ))}
            {blocks.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Adiciona blocos ao email.</p>}
          </div>
        </div>

        {/* Segmento */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segmento (para quem envia)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select className="input" value={seg.type ?? ""} onChange={(e) => setSeg((s) => ({ ...s, type: (e.target.value || undefined) as ContactType | undefined }))}>
              <option value="">Todos os tipos</option>
              {(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((t) => (<option key={t} value={t}>{CONTACT_TYPE_LABEL[t]}</option>))}
            </select>
            <input className="input" placeholder="Zona (opcional)" value={seg.zone ?? ""} onChange={(e) => setSeg((s) => ({ ...s, zone: e.target.value || undefined }))} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={!!seg.requireConsent} onChange={(e) => setSeg((s) => ({ ...s, requireConsent: e.target.checked || undefined }))} />
              Só com consentimento (RGPD)
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Inativos há
              <input type="number" min={0} className="input w-20" value={seg.inactiveDays ?? ""} onChange={(e) => setSeg((s) => ({ ...s, inactiveDays: e.target.value ? Number(e.target.value) : undefined }))} />
              dias
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => save(false)} disabled={busy !== null} variant="ghost">
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar rascunho
          </Button>
          <Button onClick={() => save(true)} disabled={busy !== null}>
            {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar em sandbox
          </Button>
          <Button variant="ghost" onClick={() => onDone(null)}>Fechar</Button>
        </div>

        {stats && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium">Enviado em sandbox — {recipients} destinatário(s)</p>
            <StatsRow stats={stats} />
            <p className="mt-2 text-[11px] text-muted-foreground">Simulação — nenhum email real foi enviado.</p>
          </div>
        )}
      </div>

      {/* Pré-visualização */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Eye className="size-3.5" /> Pré-visualização
          </p>
          <div className="mt-3 rounded-xl border bg-background p-4">
            <p className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
              <Mail className="size-4 text-primary" /> {renderVariables(subject || "Assunto…", previewContext)}
            </p>
            <div className="mt-3 space-y-2">
              {blocks.map((b) => <BlockPreview key={b.id} block={b} />)}
              {blocks.length === 0 && <p className="text-sm text-muted-foreground">O email aparece aqui.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: EmailBlock }) {
  const t = (s?: string) => renderVariables(s ?? "", previewContext);
  switch (block.type) {
    case "heading":
      return <p className="font-display text-lg">{t(block.text) || "Título"}</p>;
    case "text":
      return <p className="text-sm text-muted-foreground">{t(block.text) || "Texto…"}</p>;
    case "button":
      return <p><span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">{t(block.text) || "Botão"}</span></p>;
    case "property":
      return <div className="rounded-lg border bg-secondary/40 p-3 text-sm">🏠 Imóvel {block.propertyRef || "—"}</div>;
    case "image":
      return <div className="grid h-24 place-items-center rounded-lg bg-secondary text-xs text-muted-foreground">Imagem</div>;
    case "divider":
      return <hr className="border-border" />;
    case "spacer":
      return <div className="h-4" />;
    default:
      return null;
  }
}
