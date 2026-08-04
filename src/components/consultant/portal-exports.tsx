"use client";

import * as React from "react";
import { Check, Copy, Download, ExternalLink, Rss } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

type Feed = "idealista" | "facebook";

interface Portal {
  key: string;
  name: string;
  desc: string;
  feed: Feed;
  accountLabel: string;
  backoffice?: string;
}

const PORTALS: Portal[] = [
  { key: "idealista", name: "Idealista", desc: "Feed XML sincronizado automaticamente.", feed: "idealista", accountLabel: "ID de anunciante Idealista", backoffice: "https://www.idealista.pt/prof/" },
  { key: "imovirtual", name: "Imovirtual", desc: "Feed XML (formato Idealista/Imovirtual).", feed: "idealista", accountLabel: "ID de conta Imovirtual" },
  { key: "facebook", name: "Facebook / Meta", desc: "Catálogo CSV (home listings) no Commerce Manager.", feed: "facebook", accountLabel: "ID do catálogo (Commerce Manager)", backoffice: "https://business.facebook.com/commerce" },
  { key: "casasapo", name: "Casa Sapo", desc: "Feed XML compatível.", feed: "idealista", accountLabel: "ID de conta Casa Sapo" },
];

type Config = Record<string, { enabled: boolean; account: string }>;
const STORAGE = "portalConfig";

/**
 * Portais & exportações — configuração real por portal: o consultor/agência
 * ativa o portal, guarda o ID de conta e copia o URL do FEED que o portal
 * subscreve (Idealista/Imovirtual/Casa Sapo XML, Facebook CSV). Também permite
 * descarregar/abrir o feed na hora.
 */
export function PortalExports({ agentId, count }: { agentId: string; count: number }) {
  const [cfg, setCfg] = React.useState<Config>({});
  const [origin, setOrigin] = React.useState("");
  const [copied, setCopied] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOrigin(window.location.origin);
    try { setCfg(JSON.parse(localStorage.getItem(STORAGE) || "{}")); } catch {}
  }, []);

  function save(next: Config) {
    setCfg(next);
    try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch {}
  }
  function set(key: string, patch: Partial<{ enabled: boolean; account: string }>) {
    const cur = cfg[key] ?? { enabled: false, account: "" };
    save({ ...cfg, [key]: { ...cur, ...patch } });
  }

  function feedUrl(feed: Feed) {
    return `${origin}/api/feeds/${feed}?agent=${encodeURIComponent(agentId)}`;
  }
  async function copy(url: string, key: string) {
    try { await navigator.clipboard.writeText(url); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-2xl border bg-secondary/40 p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Rss className="size-4 text-primary" /> Como publicar
        </p>
        <p className="mt-1">
          Cada portal subscreve o <strong>URL do feed</strong> abaixo (agendado no backoffice do portal) e
          sincroniza sozinho os teus <strong>{count}</strong> imóveis publicados. Ativa o portal, guarda o
          ID de conta e cola o URL do feed no portal — ou descarrega o ficheiro para importação manual.
        </p>
      </div>

      {PORTALS.map((portal) => {
        const c = cfg[portal.key] ?? { enabled: false, account: "" };
        const url = feedUrl(portal.feed);
        return (
          <div key={portal.key} className={cn("rounded-2xl border bg-card p-4 shadow-sm", c.enabled && "ring-1 ring-primary/30")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{portal.name}</p>
                <p className="text-xs text-muted-foreground">{portal.desc}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={c.enabled}
                  onChange={(e) => set(portal.key, { enabled: e.target.checked })}
                />
                {c.enabled ? "Ativo" : "Inativo"}
              </label>
            </div>

            {c.enabled && (
              <div className="mt-3 space-y-2.5">
                <div>
                  <label className="text-xs text-muted-foreground">{portal.accountLabel}</label>
                  <input
                    className={box}
                    value={c.account}
                    onChange={(e) => set(portal.key, { account: e.target.value })}
                    placeholder="Cola aqui o teu ID…"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">URL do feed ({portal.feed === "facebook" ? "CSV" : "XML"})</label>
                  <div className="flex items-center gap-2">
                    <input readOnly className={cn(box, "font-mono text-xs")} value={url} onFocus={(e) => e.target.select()} />
                    <Button variant="outline" size="sm" onClick={() => copy(url, portal.key)}>
                      {copied === portal.key ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a href={url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      {portal.feed === "facebook" ? <Download className="size-3.5" /> : <ExternalLink className="size-3.5" />}
                      {portal.feed === "facebook" ? "Descarregar CSV" : "Abrir feed XML"}
                    </Button>
                  </a>
                  {portal.backoffice && (
                    <a href={portal.backoffice} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="size-3.5" /> Backoffice {portal.name}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
