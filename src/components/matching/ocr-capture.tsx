"use client";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { parseBuyerOcr, type OcrSuggestion } from "@/lib/matching/ocr";
export function OcrCapture({ onApply, disabled }: { onApply: (p: OcrSuggestion) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null), [text, setText] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function read(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) { setMessage("Use JPG, PNG ou WebP até 12 MB. No iPhone, escolha uma fotografia em formato compatível."); return; }
    setBusy(true); setMessage("A preparar leitura no seu dispositivo…");
    let worker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | undefined;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("por", 1, { workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js", corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0", langPath: "https://tessdata.projectnaptha.com/4.0.0", logger: m => { if (m.status === "recognizing text") setMessage(`A ler fotografia: ${Math.round(m.progress * 100)}%`); } });
      const result = await worker.recognize(file); setText(previous => previous ? `${previous}\n\n${result.data.text}` : result.data.text); setMessage(`Leitura concluída (${Math.round(result.data.confidence)}% de confiança). Reveja o texto e os campos sugeridos.`);
    } catch { setMessage("Não foi possível ler a fotografia. Pode colar o texto abaixo ou preencher manualmente."); }
    finally { await worker?.terminate(); setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <section className="rounded-2xl border border-dashed bg-secondary/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Ler ficha por fotografia</h3><p className="mt-1 text-sm text-muted-foreground">Fotografe ou carregue a ficha. A imagem é lida no dispositivo e não é guardada.</p></div><button type="button" disabled={busy || disabled} onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin"/> : <Camera className="size-4"/>} Fotografar / carregar</button></div>
    <input ref={input} aria-label="Fotografia da ficha de comprador" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={e => void read(e.target.files?.[0])}/>
    <p role="status" className="mt-2 text-sm text-muted-foreground">{message || "Texto impresso é mais fiável; escrita à mão pode exigir correções."}</p>
    <details className="mt-3" open={Boolean(text)}><summary className="cursor-pointer text-sm font-medium">Texto lido e revisão</summary><textarea aria-label="Texto extraído da ficha" value={text} onChange={e => setText(e.target.value)} maxLength={15000} rows={6} className="input mt-3 h-auto" placeholder="Nome: …&#10;Telefone: …&#10;Orçamento máximo: …&#10;Zona: …&#10;Tipologia: …&#10;Prazo: 3 meses"/><button type="button" disabled={!text.trim() || busy || disabled} onClick={() => { onApply(parseBuyerOcr(text)); setMessage("Sugestões aplicadas ao formulário. Confirme os campos antes de guardar."); }} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Aplicar sugestões ao formulário</button><p className="mt-2 text-sm text-muted-foreground">Só são preenchidos campos reconhecidos. Consentimentos e opções de venda/permuta são confirmados pelo agente.</p></details>
  </section>;
}
