"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileDown,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EQUIPAMENTOS,
  ENERGIAS,
  TIPOS,
  TIPOLOGIAS,
  VISTAS,
  blankImovel,
  slugify,
  type ImovelDoc,
  type ImovelDraft,
} from "@/lib/imovel/model";
import { toIdealistaXML } from "@/lib/imovel/idealista";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

/** Aplica marca de água "HousePro" em mosaico + selo de canto (client-side). */
async function watermark(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // Mosaico diagonal
  ctx.save();
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(-Math.atan2(c.height, c.width));
  const fs = Math.max(22, c.width * 0.028);
  ctx.font = `700 ${fs}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  const text = "HousePro";
  const stepX = ctx.measureText(text).width + fs * 2.2;
  for (let y = -c.height; y < c.height; y += fs * 3.2) {
    for (let x = -c.width; x < c.width; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();

  // Selo de canto
  const pad = Math.max(10, c.width * 0.012);
  const bh = Math.max(26, c.width * 0.038);
  ctx.font = `700 ${bh * 0.55}px sans-serif`;
  const label = "HousePro";
  const bw = ctx.measureText(label).width + bh;
  ctx.fillStyle = "rgba(20,40,32,0.72)";
  ctx.fillRect(pad, c.height - bh - pad, bw, bh);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, pad + bh * 0.5, c.height - bh / 2 - pad);

  return c.toDataURL("image/jpeg", 0.85);
}

export default function NovoImovel() {
  const [d, setD] = React.useState<ImovelDraft>(() => blankImovel("novo"));
  const [originals, setOriginals] = React.useState<string[]>([]);
  const [fotos, setFotos] = React.useState<string[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [xml, setXml] = React.useState<string | null>(null);

  function patch(p: Partial<ImovelDraft>) {
    setD((prev) => ({ ...prev, ...p }));
    setSaved(false);
  }

  // Reprocessa fotos quando a marca de água liga/desliga
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setProcessing(true);
      const out = await Promise.all(
        originals.map((o) => (d.watermark ? watermark(o) : Promise.resolve(o)))
      );
      if (alive) {
        setFotos(out);
        setProcessing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [originals, d.watermark]);

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = await Promise.all(files.map(readFile));
    setOriginals((prev) => [...prev, ...urls]);
    e.target.value = "";
  }
  function removePhoto(i: number) {
    setOriginals((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onDocs(e: React.ChangeEvent<HTMLInputElement>, kind: string) {
    const files = Array.from(e.target.files ?? []);
    const docs: ImovelDoc[] = files.map((f) => ({ name: f.name, kind }));
    patch({ documentos: [...d.documentos, ...docs] });
    if (kind === "planta" && files.length) patch({ planta: true });
    e.target.value = "";
  }
  function validateDoc(i: number) {
    patch({
      documentos: d.documentos.map((doc, idx) =>
        idx === i ? { ...doc, validated: true } : doc
      ),
    });
  }

  function save() {
    const { ...persist } = d;
    localStorage.setItem("imovel:novo", JSON.stringify({ ...persist, fotosCount: fotos.length }));
    setSaved(true);
  }

  function exportarIdealista() {
    const draft = { ...d, fotosCount: fotos.length };
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

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Área profissional
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportarIdealista}>
              <FileDown className="size-4" /> Exportar Idealista
            </Button>
            <Button size="sm" onClick={save}>
              {saved ? "Guardado" : "Guardar rascunho"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-medium text-primary">Carregar imóvel</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">Novo imóvel</h1>
        </div>

        {/* Fotos + marca de água */}
        <Card title="Fotografias">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <ImagePlus className="size-4" /> Adicionar fotos
              <input type="file" accept="image/*" multiple onChange={onPhotos} className="hidden" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.watermark}
                onChange={(e) => patch({ watermark: e.target.checked })}
                className="size-4 accent-primary"
              />
              Marca de água automática
              {processing && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </label>
          </div>
          {fotos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fotos.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            A marca de água é aplicada automaticamente a cada foto — não precisa de a fazer manualmente.
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
            <Field label="Operação">
              <select value={d.operation} onChange={(e) => patch({ operation: e.target.value as ImovelDraft["operation"] })} className={box}>
                <option value="venda">Venda</option>
                <option value="arrendamento">Arrendamento</option>
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
            <Field label="Preço (€)"><Input type="number" value={d.price || ""} onChange={(e) => patch({ price: Number(e.target.value) || 0 })} /></Field>
            <Field label="Área (m²)"><Input type="number" value={d.area || ""} onChange={(e) => patch({ area: Number(e.target.value) || 0 })} /></Field>
            <Field label="Ano de construção"><Input type="number" value={d.anoConstrucao} onChange={(e) => patch({ anoConstrucao: e.target.value })} placeholder="2005" /></Field>
            <Field label="Quartos"><Input type="number" value={d.beds || ""} onChange={(e) => patch({ beds: Number(e.target.value) || 0 })} /></Field>
            <Field label="Casas de banho"><Input type="number" value={d.baths || ""} onChange={(e) => patch({ baths: Number(e.target.value) || 0 })} /></Field>
            <Field label="Certificado energético">
              <select value={d.energy} onChange={(e) => patch({ energy: e.target.value })} className={box}>
                {ENERGIAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Freguesia"><Input value={d.parish} onChange={(e) => patch({ parish: e.target.value })} /></Field>
            <Field label="Concelho"><Input value={d.municipality} onChange={(e) => patch({ municipality: e.target.value })} /></Field>
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

        {/* Documentos & planta */}
        <Card title="Documentos & planta">
          <div className="flex flex-wrap gap-2">
            <DocInput label="Caderneta predial" kind="caderneta" onChange={onDocs} />
            <DocInput label="Certificado energético" kind="cert_energetico" onChange={onDocs} />
            <DocInput label="Planta" kind="planta" onChange={onDocs} />
            <DocInput label="Outro" kind="outro" onChange={onDocs} />
          </div>
          {d.documentos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {d.documentos.map((doc, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.name}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{doc.kind}</span>
                  </span>
                  {doc.validated ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <Check className="size-3.5" /> Validado
                    </span>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => validateDoc(i)}>
                      Ler para validar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            A leitura dos documentos (OCR) valida áreas, morada e certificado energético; corre no
            servidor em produção. Aqui, marca como validado para efeitos de demonstração.
          </p>
        </Card>

        {/* Export preview */}
        {xml && (
          <Card title="Exportação Idealista (pré-visualização)">
            <pre className="max-h-80 overflow-auto rounded-lg bg-secondary/50 p-4 text-xs">{xml}</pre>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save}><Upload className="size-4" /> {saved ? "Guardado" : "Guardar rascunho"}</Button>
          <Button variant="outline" onClick={exportarIdealista}><FileDown className="size-4" /> Exportar Idealista (XML)</Button>
        </div>
      </main>
    </div>
  );
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

function DocInput({
  label,
  kind,
  onChange,
}: {
  label: string;
  kind: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, kind: string) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
      <Upload className="size-4" /> {label}
      <input type="file" multiple className="hidden" onChange={(e) => onChange(e, kind)} />
    </label>
  );
}
