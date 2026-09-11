"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  Eye,
  FileDown,
  FileText,
  History,
  ImagePlus,
  Loader2,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOC_KINDS,
  EQUIPAMENTOS,
  ENERGIAS,
  BUSINESS_TYPES,
  LOCATION_PRIVACY,
  cmiExpiryISO,
  expiryStatus,
  LISTING_STATES,
  MANUAL_TAGS,
  operationOf,
  TIPOS,
  TIPOLOGIAS,
  VISTAS,
  blankImovel,
  docLabel,
  docStatus,
  draftQuality,
  slugify,
  type ImovelDoc,
  type ImovelDraft,
} from "@/lib/imovel/model";
import {
  defaultWatermark,
  readWatermarkConfig,
  type WatermarkConfig,
} from "@/lib/config";
import { toIdealistaXML } from "@/lib/imovel/idealista";
import { commissionLabel } from "@/lib/data/commission";
import type { AuditEntry } from "@/lib/data/audit";
import { PhotoManager, type Photo } from "@/components/property/photo-manager";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

let photoSeq = 0;
/** Cria um item de fotografia NOVA a partir do data URL original (sem marca). */
function newPhoto(raw: string): Photo {
  return { id: `n${Date.now()}-${photoSeq++}`, kind: "new", raw, url: raw, division: "" };
}

/** Tamanho aproximado (bytes) de um data URL. */
function bytesOf(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/** Exporta o canvas em JPEG, baixando a qualidade até ficar SOB o limite
 *  (algumas plataformas/portais rejeitam imagens acima de ~5MB). */
function encodeUnder(c: HTMLCanvasElement, maxBytes = 4_500_000): string {
  let q = 0.85;
  let out = c.toDataURL("image/jpeg", q);
  while (bytesOf(out) > maxBytes && q > 0.4) {
    q -= 0.1;
    out = c.toDataURL("image/jpeg", q);
  }
  return out;
}

/** Reduz a foto (máx. lado + limite de tamanho) — memória, velocidade e portais. */
async function downscale(dataUrl: string, maxDim = 2000): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return encodeUnder(c);
}

/** Envia um data URL (JPEG) para o Storage e devolve o URL público. */
async function uploadDataUrl(
  supabase: ReturnType<typeof createClient>,
  dataUrl: string
): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `props/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const up = await supabase.storage
      .from("property-media")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (up.error) return null;
    return supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/** Campo de upload de uma imagem (com pré-visualização) para o antes/depois. */
function BAUpload({
  label,
  value,
  onFile,
}: {
  label: string;
  value?: string;
  onFile: (dataUrl: string) => void;
}) {
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      onFile(await downscale(await readFile(f)));
    } catch {
      /* ignora ficheiro ilegível */
    }
    e.target.value = "";
  }
  return (
    <label className="block cursor-pointer">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={label} className="aspect-[4/3] w-full rounded-lg border object-cover" />
      ) : (
        <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
          <ImagePlus className="mr-1.5 size-4" /> Escolher imagem
        </span>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={pick} />
    </label>
  );
}

/** Marca de água única "HousePro" segundo o estilo GLOBAL da marca. */
async function watermark(dataUrl: string, cfg: WatermarkConfig): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const MAXD = 2000;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > MAXD) {
    const scale = MAXD / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const alphaCfg = Math.max(0, Math.min(1, cfg.opacity / 100));
  const marginBase = Math.max(10, c.width * 0.02);
  const posCfg = cfg.position;
  const hz = posCfg.endsWith("left") ? "left" : posCfg.endsWith("right") ? "right" : "center";
  const vt = posCfg.startsWith("top") ? "top" : posCfg.startsWith("bottom") ? "bottom" : "center";

  // Modo logótipo: compõe a imagem carregada pelo admin sobre a foto.
  if (cfg.mode === "logo" && cfg.logo) {
    try {
      const logo = new Image();
      // Evita "tainted canvas" quando o logótipo vem do Storage (outro domínio).
      logo.crossOrigin = "anonymous";
      logo.src = cfg.logo;
      await logo.decode();
      const lw = (c.width * cfg.size * 5) / 100; // largura = size% × 5 da foto
      const lh = logo.naturalHeight
        ? (lw * logo.naturalHeight) / logo.naturalWidth
        : lw;
      const lx = hz === "left" ? marginBase : hz === "right" ? c.width - lw - marginBase : (c.width - lw) / 2;
      const ly = vt === "top" ? marginBase : vt === "bottom" ? c.height - lh - marginBase : (c.height - lh) / 2;
      ctx.globalAlpha = alphaCfg;
      ctx.drawImage(logo, lx, ly, lw, lh);
      ctx.globalAlpha = 1;
      return encodeUnder(c);
    } catch {
      /* falha a ler o logótipo → cai para o texto abaixo */
    }
  }

  const label = cfg.label || "HousePro";
  const fs = Math.max(14, (c.width * cfg.size) / 100);
  ctx.font = `700 ${fs}px sans-serif`;
  const tw = ctx.measureText(label).width;
  const padX = fs * 0.5;
  const padY = fs * 0.35;
  const bw = tw + padX * 2;
  const bh = fs + padY * 2;
  const margin = Math.max(10, c.width * 0.02);
  const pos = cfg.position;

  const horiz = pos.endsWith("left") ? "left" : pos.endsWith("right") ? "right" : "center";
  const vert = pos.startsWith("top") ? "top" : pos.startsWith("bottom") ? "bottom" : "center";
  const x = horiz === "left" ? margin : horiz === "right" ? c.width - bw - margin : (c.width - bw) / 2;
  const y = vert === "top" ? margin : vert === "bottom" ? c.height - bh - margin : (c.height - bh) / 2;

  const alpha = Math.max(0, Math.min(1, cfg.opacity / 100));
  const r = bh * 0.25;
  ctx.fillStyle = `rgba(20,40,32,${0.55 * alpha})`;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, bw, bh, r);
  else ctx.rect(x, y, bw, bh);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, x + padX, y + bh / 2);

  return encodeUnder(c);
}

export interface PropertyFormProps {
  /** "create" carrega um imóvel novo; "edit" edita um existente. */
  mode?: "create" | "edit";
  /** Rascunho inicial (em edição, derivado do imóvel via draftFromProperty). */
  initial?: ImovelDraft;
  /** Fotos já publicadas (URLs remotos, já com marca de água) — só em edição. */
  initialPhotos?: string[];
  /** Divisão de cada foto publicada, alinhada por índice com initialPhotos. */
  initialDivisions?: string[];
  /** Id do imóvel em edição (para o endpoint de atualização e o link de volta). */
  propertyId?: string;
  /** Histórico de rastreio a mostrar em edição. */
  audit?: AuditEntry[];
  demo?: boolean;
}

export function PropertyForm({
  mode = "create",
  initial,
  initialPhotos = [],
  initialDivisions = [],
  propertyId,
  audit = [],
  demo = false,
}: PropertyFormProps = {}) {
  const isEdit = mode === "edit";
  const [d, setD] = React.useState<ImovelDraft>(() => initial ?? blankImovel("novo"));
  /** Lista ordenada de fotografias (remotas já publicadas + novas). A 1.ª é a capa. */
  const [photos, setPhotos] = React.useState<Photo[]>(() =>
    initialPhotos.map((u, i) => ({ id: `r${i}-${u.slice(-10)}`, kind: "remote" as const, url: u, division: initialDivisions[i] ?? "" }))
  );
  const [processing, setProcessing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState<null | "ok" | "noop" | "err">(null);
  const [history, setHistory] = React.useState<AuditEntry[]>(audit);
  const [xml, setXml] = React.useState<string | null>(null);
  const [wm, setWm] = React.useState<WatermarkConfig>(defaultWatermark);
  const [preview, setPreview] = React.useState<ImovelDoc | null>(null);
  const [driveUrl, setDriveUrl] = React.useState("");
  const [importing, setImporting] = React.useState<null | { done: number; total: number }>(null);

  // Lê o estilo global da marca de água (definido pelo admin). Primeiro o
  // cache local (instantâneo); depois o global do Supabase (fonte de verdade).
  React.useEffect(() => {
    setWm(readWatermarkConfig());
    fetch("/api/brand/watermark")
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) setWm({ ...defaultWatermark, ...d.config });
      })
      .catch(() => {});
  }, []);

  function patch(p: Partial<ImovelDraft>) {
    setD((prev) => ({ ...prev, ...p }));
    setSaved(false);
  }

  // Geocodificação automática da morada → coordenadas do mapa.
  const [geo, setGeo] = React.useState<"idle" | "loading" | "ok" | "none" | "error">("idle");
  const geocode = React.useCallback(async (parish: string, municipality: string) => {
    const q = [parish, municipality].filter(Boolean).join(", ");
    if (!q) return;
    setGeo("loading");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q + ", Portugal")}`);
      const data = await res.json();
      if (data.found) {
        setD((prev) => ({ ...prev, lat: data.lat, lng: data.lng }));
        setGeo("ok");
      } else {
        setGeo("none");
      }
    } catch {
      setGeo("error");
    }
  }, []);
  // Corre automaticamente quando freguesia e concelho estão preenchidos.
  React.useEffect(() => {
    if (!d.parish.trim() || !d.municipality.trim()) return;
    const t = setTimeout(() => geocode(d.parish, d.municipality), 800);
    return () => clearTimeout(t);
  }, [d.parish, d.municipality, geocode]);

  // Aplica/atualiza a marca de água nas fotos NOVAS quando são adicionadas ou
  // quando o estilo global muda. As remotas (já publicadas) ficam intactas.
  const newIdsKey = React.useMemo(
    () => photos.filter((p) => p.kind === "new").map((p) => p.id).join(","),
    [photos]
  );
  React.useEffect(() => {
    const news = photos.filter((p) => p.kind === "new" && p.raw);
    if (!news.length) return;
    let alive = true;
    (async () => {
      setProcessing(true);
      const map = new Map<string, string>();
      for (const p of news) {
        map.set(p.id, d.watermark ? await watermark(p.raw!, wm) : p.raw!);
      }
      if (!alive) return;
      setPhotos((prev) => prev.map((p) => (map.has(p.id) ? { ...p, url: map.get(p.id)! } : p)));
      setProcessing(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newIdsKey, d.watermark, wm]);

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls: string[] = [];
    const falhas: string[] = [];
    for (const f of files) {
      try {
        // downscale reexporta sempre em JPEG (converte HEIC/PNG/WebP -> JPEG).
        urls.push(await downscale(await readFile(f)));
      } catch {
        falhas.push(f.name);
      }
    }
    if (urls.length) setPhotos((prev) => [...prev, ...urls.map(newPhoto)]);
    if (falhas.length) {
      alert(
        "Estas fotos não puderam ser lidas neste navegador (formato não suportado, ex.: HEIC de iPhone aberto no computador):\n" +
          falhas.join(", ") +
          "\n\nNo iPhone funcionam; em alternativa, guarde-as como JPEG."
      );
    }
    e.target.value = "";
  }

  /** Importa fotos de uma pasta/ficheiro do Google Drive (ou URL directo). */
  async function importFromLink() {
    const url = driveUrl.trim();
    if (!url) return;
    setImporting({ done: 0, total: 0 });
    try {
      const res = await fetch("/api/import/drive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const out = await res.json();
      if (!res.ok) {
        alert(out.error ?? "Não foi possível importar deste link.");
        setImporting(null);
        return;
      }
      const files: { name: string; fetchUrl: string }[] = out.files ?? [];
      setImporting({ done: 0, total: files.length });

      const novos: string[] = [];
      const falhas: string[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const blob = await (await fetch(files[i].fetchUrl)).blob();
          if (!blob.type.startsWith("image/")) throw new Error("não é imagem");
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(new Error("leitura"));
            fr.readAsDataURL(blob);
          });
          // downscale reexporta sempre em JPEG (converte HEIC/PNG/WebP -> JPEG).
          novos.push(await downscale(dataUrl));
        } catch {
          falhas.push(files[i].name);
        }
        setImporting({ done: i + 1, total: files.length });
      }
      if (novos.length) {
        setPhotos((prev) => [...prev, ...novos.map(newPhoto)]);
        setDriveUrl("");
      }
      if (falhas.length) {
        alert(
          `${novos.length} foto(s) importada(s). Não foi possível importar ${falhas.length}:\n` +
            falhas.join(", ")
        );
      }
    } catch {
      alert("Erro ao importar do link.");
    } finally {
      setImporting(null);
    }
  }

  // Carrega os ficheiros PRIMEIRO (sem tipo); o tipo escolhe-se a seguir, por
  // documento, no menu de cada linha — evita carregar tudo com o mesmo tipo.
  async function onDocs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const docs: ImovelDoc[] = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        kind: "",
        url: await readFile(f),
        mime: f.type,
      }))
    );
    patch({ documentos: [...d.documentos, ...docs] });
    e.target.value = "";
  }
  function removeDoc(i: number) {
    patch({ documentos: d.documentos.filter((_, idx) => idx !== i) });
  }
  function setDocKindFor(i: number, kind: string) {
    patch({
      documentos: d.documentos.map((doc, idx) => (idx === i ? { ...doc, kind } : doc)),
    });
    if (kind === "planta") patch({ planta: true });
  }
  function validateDoc(i: number) {
    patch({
      documentos: d.documentos.map((doc, idx) =>
        idx === i ? { ...doc, validated: true } : doc
      ),
    });
  }

  function addPair() {
    patch({ beforeAfter: [...(d.beforeAfter ?? []), { before: "", after: "", label: "" }] });
  }
  function setPairImg(i: number, side: "before" | "after", url: string) {
    patch({
      beforeAfter: (d.beforeAfter ?? []).map((pr, idx) =>
        idx === i ? { ...pr, [side]: url } : pr
      ),
    });
  }
  function setPairLabel(i: number, label: string) {
    patch({
      beforeAfter: (d.beforeAfter ?? []).map((pr, idx) =>
        idx === i ? { ...pr, label } : pr
      ),
    });
  }
  function removePair(i: number) {
    patch({ beforeAfter: (d.beforeAfter ?? []).filter((_, idx) => idx !== i) });
  }

  function save() {
    // Não persistir os data URLs (podem ser grandes); ficam em memória/Storage.
    const persist = {
      ...d,
      documentos: d.documentos.map((doc) => ({ name: doc.name, kind: doc.kind, validated: doc.validated })),
    };
    localStorage.setItem(
      "imovel:novo",
      JSON.stringify({ ...persist, fotosCount: photos.length })
    );
    setSaved(true);
  }

  async function publicar() {
    setPublishing(true);
    setSavedMsg(null);
    try {
      const supabase = createClient();
      // Percorre as fotos PELA ORDEM definida. As remotas (URL) mantêm-se; as
      // novas (data URL) sobem para o Storage. Guarda também a divisão de cada.
      const gallery: string[] = [];
      const galleryMeta: { url: string; division?: string }[] = [];
      const erros: string[] = [];
      let newTotal = 0;
      let newOk = 0;
      for (const foto of photos.slice(0, 40)) {
        let url = foto.url;
        if (url.startsWith("data:")) {
          newTotal++;
          try {
            const blob = await (await fetch(url)).blob();
            const path = `props/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
            const up = await supabase.storage
              .from("property-media")
              .upload(path, blob, { contentType: "image/jpeg", upsert: true });
            if (up.error) { erros.push(up.error.message); continue; }
            url = supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl;
            newOk++;
          } catch (e) {
            erros.push(e instanceof Error ? e.message : String(e));
            continue;
          }
        }
        gallery.push(url);
        galleryMeta.push({ url, division: foto.division || undefined });
      }
      if (newTotal > 0 && newOk === 0) {
        alert(
          "As fotos não foram guardadas no armazenamento:\n" +
            (erros[0] ?? "erro desconhecido") +
            (isEdit ? "\n\nAs alterações não foram guardadas." : "\n\nO imóvel não foi publicado.")
        );
        setPublishing(false);
        return;
      }
      const coverUrl = gallery[0] ?? "";

      const baPairs: { before: string; after: string; label?: string }[] = [];
      for (const pair of d.beforeAfter ?? []) {
        if (!pair.before || !pair.after) continue;
        // Pares já publicados (URLs remotos) mantêm-se; os novos (data URLs) sobem.
        const bu = pair.before.startsWith("data:") ? await uploadDataUrl(supabase, pair.before) : pair.before;
        const au = pair.after.startsWith("data:") ? await uploadDataUrl(supabase, pair.after) : pair.after;
        if (bu && au) baPairs.push({ before: bu, after: au, label: pair.label || undefined });
      }

      if (isEdit && propertyId) {
        const patchBody: Record<string, unknown> = {
          ...draftToPatch(d),
          gallery,
          galleryMeta,
          coverUrl,
          beforeAfter: baPairs,
        };
        const res = await fetch("/api/properties/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: propertyId, patch: patchBody }),
        });
        const out = await res.json();
        if (res.ok && out.noop) {
          setSavedMsg("noop");
        } else if (res.ok && (out.entry || out.ok)) {
          if (out.entry) setHistory((h) => [out.entry, ...h]);
          // As fotos novas passaram a publicadas: reconstrói a lista pela ordem.
          setPhotos(gallery.map((u, i) => ({ id: `r${i}-${u.slice(-10)}`, kind: "remote" as const, url: u, division: galleryMeta[i]?.division ?? "" })));
          setSavedMsg("ok");
        } else {
          setSavedMsg("err");
        }
      } else {
        const res = await fetch("/api/properties/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...d,
            documentos: undefined,
            beforeAfter: baPairs,
            coverUrl,
            gallery,
            galleryMeta,
          }),
        });
        const out = await res.json();
        if (res.ok && out.id) {
          window.location.href = `/imovel/${out.id}`;
        } else {
          alert("Não foi possível publicar: " + (out.error ?? "erro desconhecido"));
        }
      }
    } catch {
      alert(isEdit ? "Erro ao guardar as alterações." : "Erro ao publicar o imóvel.");
      setSavedMsg("err");
    } finally {
      setPublishing(false);
    }
  }

  function exportarIdealista() {
    const draft = { ...d, fotosCount: photos.length };
    const out = toIdealistaXML(draft);
    setXml(out);
    const blob = new Blob([out], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.reference || "imovel"}-idealista.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleEquip(item: string) {
    patch({
      equipamentos: d.equipamentos.includes(item)
        ? d.equipamentos.filter((x) => x !== item)
        : [...d.equipamentos, item],
    });
  }
  function toggleTag(tag: string) {
    patch({ tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag] });
  }
  function addExpense(preset?: { label: string; period: "mensal" | "anual" }) {
    patch({ expenses: [...d.expenses, { label: preset?.label ?? "", value: 0, period: preset?.period ?? "mensal" }] });
  }
  function setExpense(i: number, p: Partial<ImovelDraft["expenses"][number]>) {
    patch({ expenses: d.expenses.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
  }
  function removeExpense(i: number) {
    patch({ expenses: d.expenses.filter((_, idx) => idx !== i) });
  }

  const visibleKinds = DOC_KINDS.filter((k) => k.group === "base" || d.heranca);
  const quality = draftQuality(d, photos.length);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href={isEdit && propertyId ? `/imovel/${propertyId}` : "/app"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {isEdit ? "Ver ficha do imóvel" : "Área profissional"}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportarIdealista}>
              <FileDown className="size-4" /> Exportar Idealista
            </Button>
            {isEdit ? (
              <Button size="sm" onClick={publicar} disabled={publishing}>
                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
                {publishing ? "A guardar…" : "Guardar alterações"}
              </Button>
            ) : (
              <Button size="sm" onClick={save}>
                {saved ? "Guardado" : "Guardar rascunho"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-medium text-primary">{isEdit ? "Editar imóvel" : "Carregar imóvel"}</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">
            {isEdit ? d.reference || "Editar imóvel" : "Novo imóvel"}
          </h1>
        </div>

        {isEdit && demo && (
          <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            Modo demo: as alterações registam-se no histórico mas só persistem de verdade com o Supabase ligado.
          </p>
        )}

        <section className="rounded-2xl border bg-card p-5 shadow-sm" aria-labelledby="listing-quality-title">
          <div className="flex items-center justify-between gap-4"><div><p id="listing-quality-title" className="font-semibold">Qualidade do anúncio</p><p className="text-xs text-muted-foreground">Anúncios completos ganham relevância, visibilidade e acesso aos destaques.</p></div><strong className="text-2xl text-primary">{quality.score}%</strong></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quality.score}><div className="h-full rounded-full bg-primary transition-all" style={{width:`${quality.score}%`}}/></div>
          {quality.missing.length>0?<p className="mt-3 text-xs text-muted-foreground"><b>Para chegar aos 100%:</b> {quality.missing.slice(0,5).join(", ")}{quality.missing.length>5?"…":""}</p>:<p className="mt-3 text-xs font-medium text-emerald-700">Anúncio completo e elegível para maior visibilidade.</p>}
        </section>

        {/* Fotos + marca de água */}
        <Card title="Fotografias">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <ImagePlus className="size-4" /> Adicionar fotos
              <input type="file" accept="image/*" multiple onChange={onPhotos} className="hidden" />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <Camera className="size-4" /> Tirar foto
              <input type="file" accept="image/*" capture="environment" onChange={onPhotos} className="hidden" />
            </label>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.watermark}
                onChange={(e) => patch({ watermark: e.target.checked })}
                className="size-4 accent-primary"
              />
              Marca de água
              {processing && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </label>
          </div>

          {/* Importar do Google Drive (ou link directo) — fluxo do fotógrafo */}
          <div className="mt-4 rounded-xl border bg-secondary/30 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Upload className="size-4 text-primary" /> Importar do Google Drive ou link
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cole o link da <strong>pasta partilhada</strong> do Drive com as fotos do
              fotógrafo (partilhada como &quot;qualquer pessoa com o link&quot;), ou o link
              de uma imagem. As fotos são reduzidas, convertidas para JPEG e recebem a
              marca de água automaticamente.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                className="min-w-0 flex-1"
                disabled={Boolean(importing)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={importFromLink}
                disabled={Boolean(importing) || !driveUrl.trim()}
              >
                {importing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {importing.total ? `${importing.done}/${importing.total}` : "A ler…"}
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Importar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* O estilo é global — apenas o admin o define. */}
          {d.watermark && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border bg-secondary/30 p-3 text-xs text-muted-foreground">
              <Settings2 className="mt-0.5 size-4 shrink-0" />
              <p>
                Marca de água <strong className="text-foreground">{wm.label}</strong> · tamanho{" "}
                {wm.size}% · {wm.position} · transparência {wm.opacity}%. O estilo é{" "}
                <strong className="text-foreground">global</strong> e definido pela marca em{" "}
                <Link href="/admin" className="text-primary hover:underline">/admin</Link>{" "}
                para todo o site ser consistente.
              </p>
            </div>
          )}

          <PhotoManager value={photos} onChange={setPhotos} processing={processing} />

          <p className="mt-3 text-xs text-muted-foreground">
            A marca de água é aplicada automaticamente a cada foto. Arraste (ou use as setas) para
            ordenar — a <strong>1.ª é a capa</strong> — e escolha a <strong>divisão</strong> de cada foto.
          </p>
        </Card>

        {/* Descrição & SEO */}
        <Card title="Descrição & SEO">
          <div className="space-y-4">
            <Field label="Descrição curta" hint="Uma frase-resumo (aparece nas listagens).">
              <textarea rows={2} value={d.descricaoCurta} onChange={(e) => patch({ descricaoCurta: e.target.value })} className={box} />
            </Field>
            <Field label="Descrição completa">
              <textarea rows={4} value={d.descricao} onChange={(e) => patch({ descricao: e.target.value })} className={box} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título SEO">
                <Input value={d.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value, slug: d.slug || slugify(e.target.value) })} />
              </Field>
              <Field label="Slug" hint="URL amigável.">
                <div className="flex gap-2">
                  <Input value={d.slug} onChange={(e) => patch({ slug: e.target.value })} />
                  <Button type="button" variant="outline" size="sm" onClick={() => patch({ slug: slugify(d.seoTitle || `${d.type}-${d.typology}-${d.municipality}`) })}>
                    Gerar
                  </Button>
                </div>
              </Field>
              <Field label="Meta descrição (SEO)">
                <textarea rows={2} value={d.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} className={box} />
              </Field>
              <Field label="Palavras-chave" hint="Separadas por vírgulas.">
                <Input value={d.keywords} onChange={(e) => patch({ keywords: e.target.value })} placeholder="t2, porto, varanda" />
              </Field>
            </div>
          </div>
        </Card>

        {/* Características */}
        <Card title="Características">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tipo de negócio">
              <select
                value={d.businessType}
                onChange={(e) => patch({ businessType: e.target.value, operation: operationOf(e.target.value) })}
                className={box}
              >
                {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select value={d.type} onChange={(e) => patch({ type: e.target.value })} className={box}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Tipologia">
              <select value={d.typology} onChange={(e) => patch({ typology: e.target.value })} className={box}>
                {TIPOLOGIAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Preço (€)" hint={d.priceVisible ? "Visível ao público." : "Oculto — aparece como “Sob consulta”."}>
              <div className="space-y-2">
                <Input type="number" value={d.price || ""} onChange={(e) => patch({ price: Number(e.target.value) || 0 })} />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={d.priceVisible}
                    onChange={(e) => patch({ priceVisible: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  Mostrar preço ao público
                </label>
              </div>
            </Field>
            <Field
              label="Comissão"
              hint={`Em vigor: ${commissionLabel(d.price, {
                commissionType: d.comissaoTipo,
                commissionPct: d.comissao,
                commissionFixed: d.comissaoFixo,
              })} · interna, visível a todos os consultores.`}
            >
              <div className="flex gap-2">
                <select
                  value={d.comissaoTipo}
                  onChange={(e) => patch({ comissaoTipo: e.target.value as "percent" | "fixed" })}
                  className={box + " w-28 shrink-0"}
                >
                  <option value="percent">%</option>
                  <option value="fixed">€ fixo</option>
                </select>
                {d.comissaoTipo === "percent" ? (
                  <Input type="number" step="0.1" value={d.comissao || ""} onChange={(e) => patch({ comissao: Number(e.target.value) || 0 })} placeholder="5" />
                ) : (
                  <Input type="number" step="100" value={d.comissaoFixo || ""} onChange={(e) => patch({ comissaoFixo: Number(e.target.value) || 0 })} placeholder="6000" />
                )}
              </div>
            </Field>
            <Field label="Área (m²)"><Input type="number" value={d.area || ""} onChange={(e) => patch({ area: Number(e.target.value) || 0 })} /></Field>
            <Field label="Ano de construção"><Input type="number" value={d.anoConstrucao} onChange={(e) => patch({ anoConstrucao: e.target.value })} placeholder="2005" /></Field>
            <Field label="Quartos"><Input type="number" value={d.beds || ""} onChange={(e) => patch({ beds: Number(e.target.value) || 0 })} /></Field>
            <Field label="Casas de banho"><Input type="number" value={d.baths || ""} onChange={(e) => patch({ baths: Number(e.target.value) || 0 })} /></Field>
            <Field label="Certificado energético">
              <select value={d.energy} onChange={(e) => patch({ energy: e.target.value })} className={box}>
                {ENERGIAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field
              label="Freguesia"
              hint={geoHint(geo, d.lat, d.lng)}
            >
              <Input value={d.parish} onChange={(e) => patch({ parish: e.target.value })} />
            </Field>
            <Field label="Concelho"><Input value={d.municipality} onChange={(e) => patch({ municipality: e.target.value })} /></Field>
            <Field label="Distrito"><Input value={d.distrito ?? ""} onChange={(e) => patch({ distrito: e.target.value })} placeholder="Ex.: Faro" /></Field>
            <Field label="Privacidade da morada" hint="Controla o que o mapa público mostra.">
              <select
                value={d.locationPrivacy}
                onChange={(e) => patch({ locationPrivacy: e.target.value as ImovelDraft["locationPrivacy"] })}
                className={box}
              >
                {LOCATION_PRIVACY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Referência"><Input value={d.reference} onChange={(e) => patch({ reference: e.target.value })} placeholder="HP-1050" /></Field>
            <Field label="Vista">
              <select value={d.vista} onChange={(e) => patch({ vista: e.target.value })} className={box}>
                {VISTAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          {/* Booleanas */}
          <div className="mt-4 flex flex-wrap gap-4">
            {[
              ["elevador", "Elevador"],
              ["rampa", "Rampa / acessível"],
              ["estacionamento", "Estacionamento"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={d[k as "elevador" | "rampa" | "estacionamento"]}
                  onChange={(e) => patch({ [k]: e.target.checked } as Partial<ImovelDraft>)}
                  className="size-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>

          {/* Equipamentos */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Equipamentos</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPAMENTOS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleEquip(item)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    d.equipamentos.includes(item) ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Comunidade */}
          <div className="mt-5">
            <Field label="Comunidade / envolvente" hint="Caracterize a zona (ex.: junto a escolas, transportes, comércio, praia, parque).">
              <textarea rows={2} value={d.comunidade} onChange={(e) => patch({ comunidade: e.target.value })} className={box} placeholder="Ex.: Zona tranquila, a 5 min do metro, perto de escolas e supermercados." />
            </Field>
          </div>
        </Card>

        {/* Empreendimento novo (obra nova) */}
        <Card title="Empreendimento novo (opcional)">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(d.isDevelopment)}
              onChange={(e) => patch({ isDevelopment: e.target.checked })}
              className="size-4 accent-primary"
            />
            É um empreendimento novo (nova construção)
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Ativa a categoria própria de <strong>Empreendimentos</strong> na
            montra e marca a obra como nova na exportação para os portais.
          </p>

          {d.isDevelopment && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Nome do empreendimento">
                <Input
                  value={d.developmentName ?? ""}
                  onChange={(e) => patch({ developmentName: e.target.value })}
                  placeholder="Ex.: Jardins do Tejo"
                />
              </Field>
              <Field label="Fase da obra">
                <select
                  value={d.developmentStage ?? "planta"}
                  onChange={(e) =>
                    patch({ developmentStage: e.target.value as ImovelDraft["developmentStage"] })
                  }
                  className={box}
                >
                  <option value="planta">Em planta</option>
                  <option value="construcao">Em construção</option>
                  <option value="pronto">Pronto a habitar</option>
                </select>
              </Field>
              <Field label="Nº de frações">
                <Input
                  type="number"
                  value={d.developmentUnits || ""}
                  onChange={(e) => patch({ developmentUnits: Number(e.target.value) || undefined })}
                  placeholder="Ex.: 24"
                />
              </Field>
              <Field label="Tipologias" hint="Gama disponível.">
                <Input value={d.developmentTypologies ?? ""} onChange={(e) => patch({ developmentTypologies: e.target.value })} placeholder="Ex.: T1 a T3" />
              </Field>
              <Field label="Preço desde (€)">
                <Input type="number" value={d.developmentPriceFrom || ""} onChange={(e) => patch({ developmentPriceFrom: Number(e.target.value) || undefined })} placeholder="Ex.: 285000" />
              </Field>
              <Field label="Previsão de entrega">
                <Input value={d.developmentDelivery ?? ""} onChange={(e) => patch({ developmentDelivery: e.target.value })} placeholder="Ex.: 2.º trimestre 2027" />
              </Field>
            </div>
          )}
        </Card>

        {/* Multimédia (opcional) */}
        <Card title="Multimédia (opcional)">
          <div className="space-y-4">
            <div>
              <Label htmlFor="videoUrl">Link de vídeo (YouTube, Vimeo…)</Label>
              <Input
                id="videoUrl"
                value={d.videoUrl ?? ""}
                onChange={(e) => patch({ videoUrl: e.target.value })}
                placeholder="https://youtu.be/..."
              />
            </div>
            <div>
              <Label htmlFor="tourUrl">Link do tour virtual 3D (Matterport…)</Label>
              <Input
                id="tourUrl"
                value={d.tourUrl ?? ""}
                onChange={(e) => patch({ tourUrl: e.target.value })}
                placeholder="https://my.matterport.com/..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              As fotos antes/depois (virtual staging) chegam já a seguir.
            </p>
          </div>
        </Card>

        {/* Fotos antes/depois (virtual staging) */}
        <Card title="Fotos antes/depois (virtual staging)">
          <p className="text-sm text-muted-foreground">
            Para <strong>virtual staging</strong> ou obras: por cada par, carregue a
            <strong> imagem original</strong> e a <strong>imagem com staging/obra</strong>.
            No anúncio aparecem no separador arrastável antes/depois.
          </p>
          <div className="mt-4 space-y-4">
            {(d.beforeAfter ?? []).map((pair, i) => (
              <div key={i} className="rounded-xl border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <BAUpload label="Imagem original" value={pair.before} onFile={(u) => setPairImg(i, "before", u)} />
                  <BAUpload label="Com staging / obra" value={pair.after} onFile={(u) => setPairImg(i, "after", u)} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    placeholder="Legenda (ex.: Sala)"
                    value={pair.label ?? ""}
                    onChange={(e) => setPairLabel(i, e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removePair(i)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addPair}>
              <ImagePlus className="size-4" /> Adicionar par antes/depois
            </Button>
          </div>
        </Card>

        {/* Etiquetas, encargos, proprietário e flags */}
        <Card title="Etiquetas, encargos e proprietário">
          {/* Etiquetas manuais */}
          <p className="text-sm font-medium">Etiquetas</p>
          <p className="mb-2 text-xs text-muted-foreground">
            As etiquetas de estado (reservado, vendido, CPCV, baixa de preço) são automáticas e chegam a seguir.
          </p>
          <div className="flex flex-wrap gap-2">
            {MANUAL_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  d.tags.includes(t) ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Encargos */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Encargos correntes</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addExpense({ label: "IMI", period: "anual" })}>+ IMI</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addExpense({ label: "Condomínio", period: "mensal" })}>+ Condomínio</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addExpense()}>+ Outro</Button>
              </div>
            </div>
            {d.expenses.length > 0 && (
              <ul className="mt-3 space-y-2">
                {d.expenses.map((ex, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <Input value={ex.label} onChange={(e) => setExpense(i, { label: e.target.value })} placeholder="Ex.: IMI" className="min-w-0 flex-1" />
                    <Input type="number" value={ex.value || ""} onChange={(e) => setExpense(i, { value: Number(e.target.value) || 0 })} placeholder="€" className="w-28" />
                    <select value={ex.period} onChange={(e) => setExpense(i, { period: e.target.value as "mensal" | "anual" })} className={box + " w-28 shrink-0"}>
                      <option value="mensal">/mês</option>
                      <option value="anual">/ano</option>
                    </select>
                    <button type="button" onClick={() => removeExpense(i)} aria-label="Remover encargo" className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Proprietário (privado) */}
          <div className="mt-6">
            <p className="text-sm font-medium">Contactos do proprietário</p>
            <p className="mb-2 text-xs text-muted-foreground">Privado — nunca aparece no site nem nos portais.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome"><Input value={d.ownerName ?? ""} onChange={(e) => patch({ ownerName: e.target.value })} /></Field>
              <Field label="Telefone"><Input value={d.ownerPhone ?? ""} onChange={(e) => patch({ ownerPhone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={d.ownerEmail ?? ""} onChange={(e) => patch({ ownerEmail: e.target.value })} /></Field>
              <Field label="NIF"><Input value={d.ownerNif ?? ""} onChange={(e) => patch({ ownerNif: e.target.value })} /></Field>
            </div>
          </div>

          {/* Estado + fora de mercado */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Estado" hint="Só “Activo” aparece ao público e nos portais.">
              <select value={d.listingState} onChange={(e) => patch({ listingState: e.target.value as ImovelDraft["listingState"] })} className={box}>
                {LISTING_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <label className="flex items-start gap-2 pt-6 text-sm">
              <input type="checkbox" checked={d.offMarket} onChange={(e) => patch({ offMarket: e.target.checked })} className="mt-0.5 size-4 accent-primary" />
              <span>
                Fora de mercado
                <span className="block text-xs text-muted-foreground">Visível a toda a agência, mas não ao público nem aos portais.</span>
              </span>
            </label>
          </div>

          {/* Flags operacionais */}
          <div className="mt-6 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.hasPlaca} onChange={(e) => patch({ hasPlaca: e.target.checked })} className="size-4 accent-primary" />
              Placa colocada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.hasKeys} onChange={(e) => patch({ hasKeys: e.target.checked })} className="size-4 accent-primary" />
              Chaves na agência
            </label>
          </div>
        </Card>

        {/* Contrato de mediação (CMI) e validades */}
        <Card title="Contrato de mediação (CMI) e validades">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Tipo de CMI:</span>
            {([["exclusivo", true], ["aberto", false]] as const).map(([label, val]) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  // CMI aberto → oculta a morada pública automaticamente.
                  patch(val ? { cmiExclusive: true } : { cmiExclusive: false, locationPrivacy: "hidden" })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                  d.cmiExclusive === val ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                )}
              >
                {label}
              </button>
            ))}
            <label className="ml-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.cmiRenewable} onChange={(e) => patch({ cmiRenewable: e.target.checked })} className="size-4 accent-primary" />
              Renovação automática
            </label>
          </div>
          {!d.cmiExclusive && (
            <p className="mt-2 text-xs text-muted-foreground">
              CMI aberto: a morada exata fica <strong>oculta</strong> no site (pode ajustar na privacidade da morada).
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Início do CMI">
              <Input type="date" value={d.cmiStart ?? ""} onChange={(e) => patch({ cmiStart: e.target.value })} />
            </Field>
            <Field label="Duração (meses)" hint={cmiHint(d.cmiStart, d.cmiMonths)}>
              <Input type="number" value={d.cmiMonths ?? ""} onChange={(e) => patch({ cmiMonths: Number(e.target.value) || undefined })} placeholder="6" />
            </Field>
            <Field label="Validade do certificado energético" hint={certHint(d.energyCertExpiry)}>
              <Input type="date" value={d.energyCertExpiry ?? ""} onChange={(e) => patch({ energyCertExpiry: e.target.value })} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            O sistema assinala quando o CMI ou o certificado energético estão perto de expirar (ou expirados).
          </p>
        </Card>

        {/* Documentos & planta */}
        <Card title="Documentos & planta">
          {/* Estado documental (mínimos obrigatórios) */}
          {(() => {
            const st = docStatus(d.documentos.map((x) => x.kind), d.sellerType === "empresa");
            return (
              <div
                className={cn(
                  "mb-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-sm",
                  st.complete ? "border-success/40 bg-success/5" : "border-gold/40 bg-gold/5"
                )}
              >
                {st.complete ? (
                  <span className="font-medium text-success">Documentação mínima completa</span>
                ) : (
                  <span className="font-medium text-foreground">
                    Faltam {st.missingCount} de {st.requiredTotal} documentos obrigatórios
                  </span>
                )}
                {!st.complete && (
                  <span className="text-muted-foreground">
                    ({st.missing.map((k) => docLabel(k)).join(", ")})
                  </span>
                )}
                {st.extraCount > 0 && (
                  <span className="ml-auto text-muted-foreground">+{st.extraCount} extra</span>
                )}
              </div>
            );
          })()}

          {/* Tipo de vendedor (empresa exige certidão de empresa) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Vendedor:</span>
            {(["particular", "empresa"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ sellerType: t })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                  d.sellerType === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                )}
              >
                {t}
              </button>
            ))}
            {d.sellerType === "empresa" && (
              <span className="text-xs text-muted-foreground">Exige certidão permanente de empresa.</span>
            )}
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={d.heranca}
              onChange={(e) => patch({ heranca: e.target.checked })}
              className="size-4 accent-primary"
            />
            Imóvel proveniente de herança / partilha
            <span className="text-xs text-muted-foreground">(mostra documentos adicionais)</span>
          </label>

          <p className="mt-4 text-sm text-muted-foreground">
            Carregue os ficheiros primeiro (pode ser tudo de uma vez) e <strong>escolha o tipo de
            cada um a seguir</strong>, no menu de cada linha.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <Camera className="size-4" /> Tirar foto ao documento
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onDocs}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <Upload className="size-4" /> Carregar ficheiros (PDF/imagem)
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="hidden"
                onChange={onDocs}
              />
            </label>
          </div>
          {d.documentos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {d.documentos.map((doc, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{doc.name}</span>
                    <select
                      value={doc.kind}
                      onChange={(e) => setDocKindFor(i, e.target.value)}
                      aria-label={`Tipo do documento ${doc.name}`}
                      className={cn(
                        "shrink-0 rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring",
                        !doc.kind && "border-gold/60 text-gold"
                      )}
                    >
                      <option value="">Escolher tipo…</option>
                      {visibleKinds.map((k) => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {doc.url && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(doc)}>
                        <Eye className="size-3.5" /> Ver
                      </Button>
                    )}
                    {doc.validated ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <Check className="size-3.5" /> Validado
                      </span>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => validateDoc(i)}>
                        Ler para validar
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeDoc(i)}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Remover documento"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Abra cada documento em <strong>Ver</strong> para o visualizar antes de validar. A
            leitura (OCR) valida áreas, morada e certificado energético e corre no servidor em
            produção; aqui, marque como validado para efeitos de demonstração.
          </p>
        </Card>

        {/* Export preview */}
        {xml && (
          <Card title="Exportação Idealista (pré-visualização)">
            <pre className="max-h-80 overflow-auto rounded-lg bg-secondary/50 p-4 text-xs">{xml}</pre>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isEdit ? (
            <Button variant="brand" onClick={publicar} disabled={publishing}>
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              {publishing ? "A guardar…" : "Guardar alterações"}
            </Button>
          ) : (
            <>
              <Button onClick={save} variant="outline"><Upload className="size-4" /> {saved ? "Guardado" : "Guardar rascunho"}</Button>
              <Button variant="brand" onClick={publicar} disabled={publishing}>
                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{" "}
                {publishing ? "A publicar…" : "Publicar no site"}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={exportarIdealista}><FileDown className="size-4" /> Exportar Idealista (XML)</Button>
          {savedMsg === "ok" && <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="size-4" /> Guardado.</span>}
          {savedMsg === "noop" && <span className="text-sm text-muted-foreground">Sem alterações.</span>}
          {savedMsg === "err" && <span className="text-sm text-destructive">Falha ao guardar.</span>}
        </div>

        {/* Histórico de rastreio (edição) */}
        {isEdit && (
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="size-4" /> Histórico de alterações
            </h2>
            <ol className="mt-3 space-y-2">
              {history.map((e) => (
                <li key={e.id} className="rounded-xl border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      <span className="font-medium">{e.actorName}</span>
                      <span className="text-muted-foreground"> {e.action === "criou" ? "criou o imóvel" : "editou"}</span>
                      {e.actorRole && <span className="text-muted-foreground"> · {e.actorRole}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  {e.changes && e.changes.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {e.changes.map((c, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{c.field}:</span> {c.from} → {c.to}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {history.length === 0 && (
                <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sem alterações registadas.</li>
              )}
            </ol>
          </div>
        )}
      </main>

      {/* Pré-visualização de documento */}
      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{preview.name}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{docLabel(preview.kind)}</span>
              </span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="grid size-8 place-items-center rounded-md hover:bg-secondary"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-secondary/40 p-4">
              {preview.mime === "application/pdf" ? (
                <object data={preview.url} type="application/pdf" className="h-[70dvh] w-full rounded-lg">
                  <a href={preview.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Abrir PDF
                  </a>
                </object>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70dvh] rounded-lg object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Converte o rascunho (nomes internos) para o `patch` que a API de
 *  atualização conhece (nomes do lado do Imóvel). O estado/etiqueta pública
 *  gere-se noutro sítio, por isso não é enviado daqui. */
function draftToPatch(d: ImovelDraft): Record<string, unknown> {
  return {
    ...(d.seoTitle.trim() ? { title: d.seoTitle.trim() } : {}),
    operation: operationOf(d.businessType),
    businessType: d.businessType,
    type: d.type,
    typology: d.typology,
    price: d.price,
    priceVisible: d.priceVisible,
    locationPrivacy: d.locationPrivacy,
    area: d.area,
    beds: d.beds,
    baths: d.baths,
    parish: d.parish,
    municipality: d.municipality,
    district: d.distrito ?? "",
    energy: d.energy,
    commissionType: d.comissaoTipo,
    commissionPct: d.comissao,
    commissionFixed: d.comissaoFixo,
    sellerType: d.sellerType,
    videoUrl: d.videoUrl ?? "",
    tourUrl: d.tourUrl ?? "",
    constructionYear: d.anoConstrucao === "" ? "" : Number(d.anoConstrucao),
    elevator: d.elevador,
    isDevelopment: Boolean(d.isDevelopment),
    developmentName: d.developmentName ?? "",
    developmentStage: d.developmentStage ?? "",
    developmentUnits: d.developmentUnits ?? "",
    cmiExclusive: d.cmiExclusive,
    cmiRenewable: d.cmiRenewable,
    cmiStart: d.cmiStart ?? "",
    cmiMonths: d.cmiMonths ?? "",
    energyCertExpiry: d.energyCertExpiry ?? "",
    developmentTypologies: d.developmentTypologies ?? "",
    developmentPriceFrom: d.developmentPriceFrom ?? "",
    developmentDelivery: d.developmentDelivery ?? "",
    ownerName: d.ownerName ?? "",
    ownerPhone: d.ownerPhone ?? "",
    ownerEmail: d.ownerEmail ?? "",
    ownerNif: d.ownerNif ?? "",
    hasPlaca: d.hasPlaca,
    hasKeys: d.hasKeys,
    listingState: d.listingState,
    offMarket: d.offMarket,
    expenses: d.expenses,
    tags: d.tags,
    lat: d.lat,
    lng: d.lng,
  };
}

function cmiHint(start?: string, months?: number): string | undefined {
  const st = expiryStatus(cmiExpiryISO(start, months));
  if (st.state === "none") return undefined;
  if (st.state === "expired") return `⚠️ CMI ${st.label.toLowerCase()}`;
  if (st.state === "soon") return `⚠️ CMI ${st.label.toLowerCase()}`;
  return `CMI ${st.label.toLowerCase()}`;
}

function certHint(dateISO?: string): string | undefined {
  const st = expiryStatus(dateISO);
  if (st.state === "none") return undefined;
  return (st.state === "expired" || st.state === "soon" ? "⚠️ " : "") + st.label;
}

function geoHint(
  geo: "idle" | "loading" | "ok" | "none" | "error",
  lat?: number,
  lng?: number
): string | undefined {
  if (geo === "loading") return "A localizar no mapa…";
  if (geo === "ok" && lat != null && lng != null)
    return `📍 Coordenadas automáticas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  if (geo === "none") return "Não foi possível localizar — verifique a freguesia/concelho.";
  if (geo === "error") return "Geocodificação indisponível (liga em produção).";
  return "As coordenadas do mapa são obtidas automaticamente da morada.";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
