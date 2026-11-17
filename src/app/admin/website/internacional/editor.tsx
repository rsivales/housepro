"use client";

import { useActionState, useState, startTransition, type FormEvent } from "react";
import { uploadSiteImage } from "@/lib/data/site-content";
import type { CatalogRecord } from "@/lib/db/international";
import type { InternationalProject } from "@/lib/data/international";
import { saveCurrencyPartner, saveProject } from "./actions";

const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

function Field({ name, label, value, type = "text" }: { name: string; label: string; value?: string | number; type?: string }) {
  return <label className="text-sm">{label}<input className={input} type={type} name={name} defaultValue={value} /></label>;
}

function Area({ name, label, value }: { name: string; label: string; value?: string }) {
  return <label className="text-sm sm:col-span-2">{label}<textarea className={input} rows={3} name={name} defaultValue={value} /></label>;
}

function submit(event: FormEvent<HTMLFormElement>, action: (payload: FormData) => void) {
  event.preventDefault();
  const payload = new FormData(event.currentTarget);
  startTransition(() => action(payload));
}

export function CurrencyPartnerEditor({ url }: { url: string }) {
  const [status, action, pending] = useActionState(saveCurrencyPartner, "");
  return (
    <form onSubmit={(event) => submit(event, action)} className="mt-6 space-y-3 rounded-xl border bg-card p-5">
      <h2 className="font-display text-xl">Foreign Currency Partners</h2>
      <Field name="url" label="Link oficial para pedidos de cotação" type="url" value={url} />
      <p className="text-sm text-muted-foreground">O botão de cotação aparece na montra depois de guardar o link.</p>
      <button disabled={pending} className="rounded-md border px-4 py-2 text-sm">Guardar parceiro</button>
      <p role="status" className="text-sm">{status}</p>
    </form>
  );
}

export function ProjectEditor({ record, legacy }: { record?: CatalogRecord; legacy?: InternationalProject }) {
  const p = record?.project ?? legacy;
  const c = record?.commercial;
  const [status, action, pending] = useActionState(saveProject, "");
  const [photo, setPhoto] = useState(p?.photo ?? "");
  const [upload, setUpload] = useState("");
  const [uploading, setUploading] = useState(false);

  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="cursor-pointer font-medium">{p?.title || "Novo empreendimento"}{p && (record?.published ? " · Publicado" : legacy ? " · Catálogo anterior" : " · Rascunho")}</summary>
      <form className="space-y-6 pt-5" onSubmit={(event) => submit(event, action)}>
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <input type="hidden" name="version" value={record?.updated_at ?? ""} />
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-lg">Ficha pública</legend>
          <Field name="title" label="Nome" value={p?.title} />
          <Field name="developer" label="Promotor" value={p?.developer} />
          <Field name="city" label="Cidade ou zona" value={p?.city} />
          <Field name="country" label="País" value={p?.country} />
          <Field name="deliveryYear" label="Ano de entrega" value={p?.deliveryYear} type="number" />
          <Field name="availability" label="Estado e disponibilidade" value={p?.availability} />
          <Field name="partner" label="Designação pública do parceiro" value={p?.partner} />
          <Field name="brochure" label="URL da brochura pública" value={p?.brochure} type="url" />
          <label className="text-sm">URL da imagem de capa<input className={input} name="photo" type="url" value={photo} onChange={(e) => setPhoto(e.target.value)} /></label>
          <Field name="photoAlt" label="Descrição da imagem" value={p?.photoAlt} />
          <label className="text-sm sm:col-span-2">Carregar imagem oficial do empreendimento
            <input type="file" accept="image/*" className={input} disabled={uploading || pending} onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setUpload("A carregar imagem…");
              try {
                setPhoto(await uploadSiteImage(file, "international"));
                setUpload("Imagem carregada. Guarde o empreendimento para a associar.");
              } catch {
                setUpload("Não foi possível carregar a imagem.");
              } finally {
                setUploading(false);
              }
            }} />
            <span role="status">{upload}</span>
          </label>
          <Area name="summary" label="Resumo para a montra" value={p?.summary} />
          <Area name="description" label="Descrição completa" value={p?.description} />
          <Area name="amenities" label="Comodidades (uma por linha)" value={p?.amenities?.join("\n")} />
          <Area name="highlights" label="Condições públicas e destaques (uma por linha)" value={p?.highlights.join("\n")} />
        </fieldset>
        <fieldset className="grid gap-4 border-t pt-3 sm:grid-cols-2">
          <legend className="pr-2 font-display text-lg">Tipologias e preços</legend>
          <Field name="currency" label="Moeda do preço do promotor" value={p?.currency ?? "AED"} />
          <Field name="priceFrom" label="Preço desde (moeda original)" value={p?.priceFrom || undefined} />
          <Area name="units" label="Tipologias e preços (uma por linha, ex. T2 | 1500000)" value={p?.units?.map((unit) => [unit.type, unit.price].join(" | ")).join("\n") ?? p?.typologies} />
          <Field name="eur" label="EUR por unidade da moeda original" value={p?.rates?.eur} />
          <Field name="usd" label="USD por unidade da moeda original" value={p?.rates?.usd} />
          <Field name="rateDate" label="Data das taxas" value={p?.rates?.date} type="date" />
        </fieldset>
        <fieldset className="grid gap-4 border-t pt-3 sm:grid-cols-2">
          <legend className="pr-2 font-display text-lg">Parceria e condições internas</legend>
          <Field name="agency" label="Agência parceira" value={c?.agency} />
          <Field name="contact" label="Contacto local" value={c?.contact} />
          <Field name="email" label="Email do contacto" value={c?.email} type="email" />
          <Field name="agreementReference" label="Referência do protocolo" value={c?.agreementReference} />
          <Field name="agreementExpires" label="Validade do protocolo" value={c?.agreementExpires} type="date" />
          <Field name="commission" label="Comissão esperada (% ou montante e moeda)" value={c?.commission} />
          <Area name="commissionTerms" label="Partilha, base de cálculo, marcos e prazo de pagamento" value={c?.commissionTerms} />
          <Area name="internalNotes" label="Notas internas" value={c?.internalNotes} />
          <label className="text-sm">Tipo de documento<select className={input} name="documentKind"><option>Protocolo</option><option>Tabela de preços</option><option>Comissões</option><option>Outro</option></select></label>
          <label className="text-sm">Anexar PDF privado (até 4 MB)<input name="document" type="file" accept="application/pdf" className={input} /></label>
          {!!c?.documents?.length && <ul className="space-y-2 text-sm sm:col-span-2">{c.documents.map((file) => (
            <li key={file.path}><a className="underline" href={`/api/admin/international-document?${new URLSearchParams({ project: record!.id, file: file.path })}`}>{file.kind} — {file.name}</a></li>
          ))}</ul>}
        </fieldset>
        <div className="flex flex-wrap gap-4 text-sm">
          <label><input type="checkbox" name="authorized" defaultChecked={record?.published} /> Divulgação autorizada</label>
          <label><input type="checkbox" name="published" defaultChecked={record?.published} /> Publicar no website</label>
          <label><input type="checkbox" name="featured" defaultChecked={record?.featured} /> Usar como destaque principal</label>
        </div>
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={pending || uploading}>{pending ? "A guardar…" : "Guardar empreendimento"}</button>
        {status && <p role="status" className="text-sm">{status}</p>}
      </form>
    </details>
  );
}
