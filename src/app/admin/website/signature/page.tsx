"use client";

import * as React from "react";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import {
  loadSiteContent,
  publishSection,
  uploadSiteImage,
} from "@/lib/data/site-content";

const initial = {
  eyebrow: "HOUSEPRO SIGNATURE",
  title: "Imóveis verdadeiramente únicos.",
  text: "Uma seleção reservada de propriedades excecionais.",
  label: "Descobrir Signature",
  href: "/signature",
  image: "/signature/editorial-coast-hero.webp",
  alt: "Imóvel de luxo HousePro Signature junto ao mar",
};

export default function SignatureBannerAdmin() {
  const [value, setValue] = React.useState(initial);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    loadSiteContent(true).then((content) =>
      setValue((current) => ({
        ...current,
        ...(content.signaturepromo || {}),
      })),
    );
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    setStatus("A preparar e enviar a imagem…");
    try {
      const image = await uploadSiteImage(file, "banners", ({ label }) =>
        setStatus(label),
      );
      setValue((current) => ({ ...current, image }));
      setStatus("Imagem pronta. Clique em Publicar alterações.");
    } catch {
      setStatus("Não foi possível enviar a imagem.");
    }
  }

  async function save() {
    setStatus("A publicar…");
    const result = await publishSection("signaturepromo", value);
    setStatus(
      result.ok ? "Publicado com sucesso." : "Não foi possível guardar.",
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link href="/admin/website" className="text-sm text-primary">
          ← Website
        </Link>
        <h1 className="mt-4 font-display text-3xl">
          Banner HousePro Signature
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Banner promocional apresentado entre os imóveis em destaque e o Guia
          HousePro.
        </p>
        <div className="mt-7 grid gap-4 rounded-2xl border bg-card p-5">
          <Field
            label="Eyebrow"
            value={value.eyebrow}
            set={(eyebrow) => setValue({ ...value, eyebrow })}
          />
          <Field
            label="Título"
            value={value.title}
            set={(title) => setValue({ ...value, title })}
          />
          <Field
            label="Texto"
            value={value.text}
            set={(text) => setValue({ ...value, text })}
          />
          <Field
            label="Texto do botão"
            value={value.label}
            set={(label) => setValue({ ...value, label })}
          />
          <Field
            label="Destino"
            value={value.href}
            set={(href) => setValue({ ...value, href })}
          />
          <Field
            label="Texto alternativo da imagem"
            value={value.alt}
            set={(alt) => setValue({ ...value, alt })}
          />
          <label className="text-sm">
            Fotografia
            <input
              type="file"
              accept="image/*"
              onChange={(event) => upload(event.target.files?.[0])}
              className="mt-1 block text-sm"
            />
          </label>
          {value.image && (
            <img
              src={value.image}
              alt={value.alt}
              className="h-52 w-full rounded-xl object-cover"
            />
          )}
          <button
            onClick={save}
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-white"
          >
            Publicar alterações
          </button>
          {status && (
            <p role="status" className="text-sm">
              {status}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        value={value}
        onChange={(event) => set(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
