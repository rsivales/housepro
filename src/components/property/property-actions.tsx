"use client";

import * as React from "react";
import { Printer, Share2, FileDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { qrSvg } from "@/lib/qr";

export interface PrintInfo {
  title: string;
  price: string;
  reference: string;
  location: string;
  specs: { label: string; value: string }[];
  image: string;
  description: string;
  contactName: string;
  contactRole: string;
  contactPhoneNote: string;
}

export function PropertyActions({ info }: { info: PrintInfo }) {
  const [url, setUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setUrl(window.location.href);
  }, []);

  // QR gerado automaticamente a partir do endereço do imóvel.
  const qrMarkup = React.useMemo(
    () => (url ? qrSvg(url, { margin: 2 }) : ""),
    [url]
  );

  async function share() {
    const shareData = { title: info.title, text: `${info.title} · ${info.price}`, url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* utilizador cancelou — cai para copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function openPrintable() {
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    const specsRows = info.specs
      .map(
        (s) =>
          `<tr><td class="k">${s.label}</td><td class="v">${escapeHtml(s.value)}</td></tr>`
      )
      .join("");
    const qr = qrSvg(url, { margin: 1 });
    w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>${escapeHtml(info.reference)} · HousePro</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #16261f; margin: 0; padding: 32px; }
  .brand { font-weight: 700; letter-spacing: .02em; color: #1f4a3a; font-size: 20px; }
  h1 { font-size: 24px; margin: 4px 0 2px; }
  .price { font-size: 26px; font-weight: 700; margin: 8px 0; }
  .muted { color: #5b6b64; font-size: 13px; }
  img.cover { width: 100%; height: 320px; object-fit: cover; border-radius: 12px; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e6ebe8; }
  td.k { color: #5b6b64; width: 45%; }
  td.v { font-weight: 600; text-align: right; }
  .desc { font-size: 14px; line-height: 1.55; margin-top: 16px; }
  .footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 28px; padding-top: 16px; border-top: 2px solid #1f4a3a; }
  .qr { width: 120px; height: 120px; }
  .contact b { display: block; font-size: 15px; }
  @media print { body { padding: 0; } @page { margin: 16mm; } }
</style></head><body onload="window.focus()">
  <div class="brand">HousePro</div>
  <h1>${escapeHtml(info.title)}</h1>
  <div class="muted">${escapeHtml(info.location)} · Ref. ${escapeHtml(info.reference)}</div>
  <div class="price">${escapeHtml(info.price)}</div>
  <img class="cover" src="${info.image}" alt="">
  <table>${specsRows}</table>
  <div class="desc">${escapeHtml(info.description)}</div>
  <div class="footer">
    <div class="contact">
      <span class="muted">Consultor dedicado</span>
      <b>${escapeHtml(info.contactName)}</b>
      <span class="muted">${escapeHtml(info.contactRole)}</span>
      <div class="muted">${escapeHtml(info.contactPhoneNote)}</div>
    </div>
    <div style="text-align:center">
      <div class="qr">${qr}</div>
      <div class="muted" style="margin-top:4px">Aponte a câmara</div>
    </div>
  </div>
  <script>window.onafterprint = function(){ setTimeout(function(){ window.close(); }, 200); }; setTimeout(function(){ window.print(); }, 300);</script>
</body></html>`);
    w.document.close();
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={share} className="flex-1">
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {copied ? "Link copiado" : "Partilhar"}
        </Button>
        <Button variant="outline" size="sm" onClick={openPrintable} className="flex-1">
          <Printer className="size-4" /> Imprimir
        </Button>
        <Button variant="outline" size="sm" onClick={openPrintable} className="flex-1">
          <FileDown className="size-4" /> Gerar PDF
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border bg-secondary/40 p-3">
        <div
          className="size-20 shrink-0 rounded-lg bg-white p-1"
          aria-label="Código QR do imóvel"
          dangerouslySetInnerHTML={{ __html: qrMarkup }}
        />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Código QR automático</span> — aponte a
          câmara do telemóvel para abrir esta página. Incluído também na impressão e no PDF.
        </p>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return String(s ?? "").replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!
  );
}
