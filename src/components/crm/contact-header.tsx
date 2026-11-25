"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, MapPin, Pencil, Phone, Wallet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CONTACT_TYPE_LABEL, type Contact, type ContactType } from "@/lib/data/contacts";
import { BuyerFields } from "@/components/matching/buyer-fields";
import { OcrCapture } from "@/components/matching/ocr-capture";
import { buyerTemperature, TEMPERATURE_LABEL, qualificationRef } from "@/lib/matching/profile";
import { XCallButton } from "@/components/xcall/xcall-dialog";

/** Cabeçalho da ficha de contacto, com edição inline — corrigir dados ou
 *  mudar o tipo (ex.: comprador → proprietário/vendedor) sem sair da página.
 *  NIF, documento e morada ficam vazios até serem precisos (CPCV/escritura). */
export function ContactHeader({ contact, readOnly = false }: { contact: Contact; readOnly?: boolean }) {
  const router = useRouter();
  const [buyerProfile, setBuyerProfile] = React.useState(contact.buyerProfile ?? {});
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [name, setName] = React.useState(contact.name);
  const [phone, setPhone] = React.useState(contact.phone ?? "");
  const [email, setEmail] = React.useState(contact.email ?? "");
  const [type, setType] = React.useState<ContactType>(contact.type);
  const [zone, setZone] = React.useState(contact.zone ?? "");
  const [budget, setBudget] = React.useState(contact.budget ?? "");
  const [nif, setNif] = React.useState(contact.nif ?? "");
  const [idDocument, setIdDocument] = React.useState(contact.idDocument ?? "");
  const [address, setAddress] = React.useState(contact.address ?? "");
  const [birthDate, setBirthDate] = React.useState(contact.birthDate ?? "");

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/contacts/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          patch: { name, phone, email, type, zone: buyerProfile.zones?.filter(Boolean).join(", ") || zone, budget, nif, idDocument, address, birthDate, buyerProfile },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error === "sem_permissao" ? "Sem permissão para editar este contacto." : "Não foi possível guardar.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-lg font-semibold text-muted-foreground">
          {contact.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl leading-tight">{contact.name}</h1>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{qualificationRef(contact.id)}</p>
          {["comprador","investidor"].includes(contact.type) && <p className="mt-1 text-sm font-medium">{TEMPERATURE_LABEL[buyerTemperature(contact.buyerProfile)]}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{CONTACT_TYPE_LABEL[contact.type]}</span>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Phone className="size-3.5" /> {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Mail className="size-3.5" /> {contact.email}
              </a>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {contact.zone && (<span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {contact.zone}</span>)}
            {contact.budget && (<span className="inline-flex items-center gap-1"><Wallet className="size-3" /> {contact.budget}</span>)}
            {contact.nif && <span>NIF {contact.nif}</span>}
            {contact.idDocument && <span>Doc. {contact.idDocument}</span>}
            {contact.address && <span className="truncate">{contact.address}</span>}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            disabled={readOnly} onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Pencil className="size-4" /> Editar
          </button>
          <XCallButton contactId={contact.id} contactName={contact.name} phone={contact.phone} scriptHint={contact.type} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
      <OcrCapture disabled={readOnly} onApply={p => { if(p.name)setName(p.name); if(p.phone)setPhone(p.phone); if(p.email)setEmail(p.email); if(p.zone)setZone(p.zone); if(p.buyerProfile)setBuyerProfile(v => ({...v,...p.buyerProfile})); }} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome *</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Telefone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value as ContactType)} className="input">
            {(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((t) => (
              <option key={t} value={t}>{CONTACT_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Zona</span>
          <input value={zone} onChange={(e) => setZone(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Orçamento anterior (texto livre)</span>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">NIF</span>
          <input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="Preencher quando necessário" className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Doc. de identificação (CC/passaporte)</span>
          <input value={idDocument} onChange={(e) => setIdDocument(e.target.value)} placeholder="Preencher quando necessário" className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Morada</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Preencher quando necessário" className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Data de nascimento</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input" />
        </label>
      </div>

      {["comprador","investidor"].includes(type) && <BuyerFields value={buyerProfile} onChange={setBuyerProfile} disabled={readOnly}/>}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar
        </Button>
        <button
          onClick={() => setEditing(false)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}
