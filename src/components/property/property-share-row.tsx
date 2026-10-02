"use client";

import * as React from "react";
import { Check, FileDown, Share2 } from "lucide-react";

import { qrSvg } from "@/lib/qr";
import { track } from "@/lib/analytics";
import { FavoriteButton } from "@/components/property/favorite-button";
import { legalLine, fullAddress, site } from "@/lib/site";

export interface ShareInfo {
  title: string;
  price: string;
  reference: string;
  location: string;
  image: string;
  description: string;
  specs: { label: string; value: string }[];
  contactName: string;
  contactRole: string;
  contactPhoneNote: string;
}

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
}

/**
 * Ações finais: Partilhar · Guardar · Gerar PDF. O QR fica reservado ao
 * PDF/impressão (não aparece na página em mobile). A ficha impressa inclui
 * logótipo, dados institucionais e QR para a página pública.
 */
export function PropertyShareRow({ info, propertyId }: { info: ShareInfo; propertyId: string }) {
  const [url, setUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setUrl(window.location.href), []);

  async function share() {
    track("pdp_share");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: info.title, text: `${info.title} · ${info.price}`, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  function openPrintable() {
    track("pdp_pdf");
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    const specsRows = info.specs.map((s) => `<tr><td class="k">${escapeHtml(s.label)}</td><td class="v">${escapeHtml(s.value)}</td></tr>`).join("");
    const qr = qrSvg(url, { margin: 1 });
    w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>${escapeHtml(info.reference)} · HousePro</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B1F3A;margin:0;padding:32px}
  .brand{font-weight:800;letter-spacing:.04em;color:#D62832;font-size:20px}
  h1{font-size:24px;margin:6px 0 2px}
  .price{font-size:26px;font-weight:700;margin:8px 0}
  .muted{color:#667085;font-size:13px}
  img.cover{width:100%;height:320px;object-fit:cover;border-radius:12px;margin:16px 0}
  table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
  td{padding:6px 8px;border-bottom:1px solid #e6ebf0}
  td.k{color:#667085;width:45%}
  td.v{font-weight:600;text-align:right}
  .desc{font-size:14px;line-height:1.55;margin-top:16px;white-space:pre-line}
  .footer{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:28px;padding-top:16px;border-top:2px solid #0B1F3A}
  .qr{width:120px;height:120px}
  .contact b{display:block;font-size:15px}
  .inst{margin-top:14px;font-size:11px;color:#667085}
  @media print{body{padding:0}@page{margin:16mm}}
</style></head><body onload="window.focus()">
  <div class="brand">HOUSEPRO</div>
  <h1>${escapeHtml(info.title)}</h1>
  <div class="muted">${escapeHtml(info.location)} · Ref. ${escapeHtml(info.reference)}</div>
  <div class="price">${escapeHtml(info.price)}</div>
  <img class="cover" src="${info.image}" alt="">
  <table>${specsRows}</table>
  <div class="desc">${escapeHtml(info.description)}</div>
  <div class="footer">
    <div class="contact">
      <span class="muted">Consultor responsável</span>
      <b>${escapeHtml(info.contactName)}</b>
      <span class="muted">${escapeHtml(info.contactRole)}</span>
      <div class="muted">${escapeHtml(info.contactPhoneNote)}</div>
    </div>
    <div style="text-align:center">
      <div class="qr">${qr}</div>
      <div class="muted" style="margin-top:4px">Aponte a câmara</div>
    </div>
  </div>
  <div class="inst">${escapeHtml(legalLine)} · ${escapeHtml(fullAddress)} · ${escapeHtml(site.email.general)}</div>
  <script>window.onafterprint=function(){setTimeout(function(){window.close()},200)};setTimeout(function(){window.print()},300)</script>
</body></html>`);
    w.document.close();
  }

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-2xl border bg-white p-2 text-sm">
      <button type="button" onClick={share} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-[var(--hp-navy)] transition-colors hover:bg-black/[0.04]">
        {copied ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />} {copied ? "Link copiado" : "Partilhar"}
      </button>
      <div className="flex flex-1 items-center justify-center">
        <FavoriteButton propertyId={propertyId} variant="labeled" />
      </div>
      <button type="button" onClick={openPrintable} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-[var(--hp-navy)] transition-colors hover:bg-black/[0.04]">
        <FileDown className="size-4" /> Gerar PDF
      </button>
    </div>
  );
}
