"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { currencyPartnerKey, internationalById, type InternationalProject } from "@/lib/data/international";
import { isSuperadmin } from "@/lib/data/roles";
import { httpsUrl, type InternationalCommercial } from "@/lib/db/international";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const lines = (form: FormData, key: string) => text(form, key).split("\n").map((line) => line.trim()).filter(Boolean);
const number = (value: string) => Number(value.replace(",", "."));

async function catalogAdmin() {
  const session = await getSession();
  if (!session || session.demo || !isSuperadmin(session.agent) || !hasServiceRole()) return null;
  return createAdminClient();
}

export async function saveCurrencyPartner(_: string, form: FormData) {
  const db = await catalogAdmin();
  if (!db) return "Acesso reservado ao Super Admin.";
  const value = text(form, "url");
  if (value && !httpsUrl(value)) return "Introduza um endereço HTTPS válido.";
  const { error } = await db.from("site_settings").upsert({ key: currencyPartnerKey, value: httpsUrl(value) });
  if (error) return "Não foi possível guardar o parceiro cambial.";
  revalidatePath("/internacional");
  return "Parceiro cambial guardado.";
}

export async function saveProject(_: string, form: FormData) {
  const db = await catalogAdmin();
  if (!db) return "Acesso reservado ao Super Admin.";
  const existingId = text(form, "id");
  const id = existingId || randomUUID();
  const { data: existing, error: lookupError } = await db.from("international_catalog").select("commercial, updated_at").eq("id", id).maybeSingle();
  if (lookupError || (existingId && !existing && !internationalById(id))) return "Não foi possível abrir o registo.";
  const expected = text(form, "version");
  if ((existing?.updated_at ?? "") !== expected) return "O registo foi alterado. Atualize a página antes de guardar.";

  const title = text(form, "title");
  const city = text(form, "city");
  const country = text(form, "country");
  const currency = text(form, "currency").toUpperCase();
  try { new Intl.NumberFormat("pt-PT", { style: "currency", currency }); }
  catch { return "Introduza um código de moeda com três letras, como AED, EUR ou USD."; }

  const units = lines(form, "units").map((line) => {
    const [type, price, ...extra] = line.split("|");
    return { type: type.trim(), price: extra.length ? NaN : price?.trim() ? number(price.trim()) : null };
  });
  if (units.some(({ type, price }) => !type || (price !== null && (!Number.isFinite(price) || price <= 0)))) {
    return "Use uma linha por tipologia no formato T2 | 1500000. Pode deixar o preço em branco.";
  }
  const prices = units.flatMap(({ price }) => price === null ? [] : [price]);
  const priceFrom = text(form, "priceFrom") ? number(text(form, "priceFrom")) : prices.length ? Math.min(...prices) : 0;
  const photo = httpsUrl(text(form, "photo"));
  const brochure = httpsUrl(text(form, "brochure"));
  const summary = text(form, "summary");
  const description = text(form, "description");
  const published = form.has("published");
  const eur = currency === "EUR" ? 1 : number(text(form, "eur"));
  const usd = currency === "USD" ? 1 : number(text(form, "usd"));
  const date = text(form, "rateDate");
  const validRateDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  const rates = validRateDate && Number.isFinite(eur) && Number.isFinite(usd) && eur > 0 && usd > 0 ? { eur, usd, date } : undefined;
  const yearText = text(form, "deliveryYear");
  const year = number(yearText);
  if (!title || !city || !country) return "Preencha o nome, a cidade e o país.";
  if (!Number.isFinite(priceFrom) || priceFrom < 0 || (yearText && (!Number.isInteger(year) || year < 1900 || year > 2200))) return "Verifique o preço base e o ano de entrega.";
  if ((text(form, "photo") && !photo) || (text(form, "brochure") && !brochure)) return "Use endereços HTTPS para as imagens e a brochura pública.";
  if (published && (!photo || !summary || !description || !priceFrom || !rates || !units.length || !form.has("authorized"))) {
    return "Para publicar, confirme a autorização e preencha imagem, resumo, descrição, preço, tipologias e taxas de câmbio datadas.";
  }

  const project: InternationalProject = {
    id, title, city, country, currency, summary, description, photo, brochure, rates,
    photoAlt: text(form, "photoAlt"), developer: text(form, "developer"),
    partner: text(form, "partner"), availability: text(form, "availability"),
    priceFrom, deliveryYear: year || undefined, units,
    typologies: units.map(({ type }) => type).join(" · "),
    amenities: lines(form, "amenities"), highlights: lines(form, "highlights"),
  };
  if (rates && [priceFrom, ...prices].some((price) => !Number.isFinite(price * Math.max(eur, usd)))) {
    return "Verifique as taxas de câmbio e os montantes.";
  }
  const previous: InternationalCommercial = existing?.commercial ?? {};
  const commercial: InternationalCommercial = {
    agency: text(form, "agency"), contact: text(form, "contact"),
    email: text(form, "email"), agreementReference: text(form, "agreementReference"),
    agreementExpires: text(form, "agreementExpires"), commission: text(form, "commission"),
    commissionTerms: text(form, "commissionTerms"), internalNotes: text(form, "internalNotes"),
    documents: [...previous.documents ?? []],
  };
  const file = form.get("document");
  let uploaded: string | undefined;
  if (file instanceof File && file.size) {
    if (file.type !== "application/pdf" || file.size > 4 * 1024 * 1024 || await file.slice(0, 5).text() !== "%PDF-") {
      return "Carregue um PDF até 4 MB.";
    }
    uploaded = `${id}/${randomUUID()}.pdf`;
    const { error } = await db.storage.from("international-private").upload(uploaded, file, { contentType: "application/pdf" });
    if (error) return "Não foi possível carregar o documento.";
    commercial.documents?.push({ path: uploaded, name: file.name, kind: text(form, "documentKind") || "Outro" });
  }

  const { data, error } = await db.rpc("save_international_catalog", {
    p_id: id, p_expected: expected || null, p_project: project, p_commercial: commercial,
    p_published: published, p_featured: form.has("featured"),
  });
  if (error || !data) {
    if (uploaded) await db.storage.from("international-private").remove([uploaded]);
    return "Não foi possível guardar. Volte a abrir o registo e tente novamente.";
  }

  revalidatePath("/admin/website/internacional");
  revalidatePath("/internacional");
  revalidatePath(`/internacional/${id}`);
  return published ? "Projeto publicado." : "Rascunho guardado.";
}
