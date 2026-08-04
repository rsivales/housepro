/**
 * Feeds de exportação para portais a partir dos imóveis publicados (Property[]).
 *
 * A via fiável de publicação nos portais é o FEED: o portal (Idealista,
 * Imovirtual, Facebook/Meta) subscreve um URL e sincroniza automaticamente.
 * Aqui geramos:
 *   - XML compatível com Idealista/Imovirtual
 *   - CSV de catálogo "home listings" do Facebook/Meta
 */

import type { Property } from "@/lib/data/types";

const SITE = "https://www.housepro.pt";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!
  );

const TYPE_MAP: Record<string, string> = {
  Apartamento: "flat",
  Moradia: "house",
  Terreno: "land",
  Loja: "premise",
  Escritório: "office",
};

function images(p: Property): string[] {
  const list = (p.gallery && p.gallery.length ? p.gallery : [p.image]).filter(Boolean) as string[];
  return list.map((u) => (u.startsWith("http") ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`));
}

function propertyXML(p: Property): string {
  const op = p.operation === "arrendamento" ? "rent" : "sale";
  const type = TYPE_MAP[p.type] ?? "flat";
  const imgs = images(p)
    .map((u) => `      <image><url>${esc(u)}</url></image>`)
    .join("\n");
  return `  <property>
    <reference>${esc(p.reference || p.id)}</reference>
    <operation>${op}</operation>
    <propertyType>${type}</propertyType>
    <newDevelopment>${p.isDevelopment ? "true" : "false"}</newDevelopment>
    <price currency="EUR">${p.price}</price>
    <surfaceArea unit="m2">${p.area}</surfaceArea>
    <rooms>${p.beds}</rooms>
    <bathrooms>${p.baths}</bathrooms>
    <typology>${esc(p.typology ?? "")}</typology>
    <energyCertificate>${esc(p.energy)}</energyCertificate>
    <address>
      <parish>${esc(p.parish)}</parish>
      <town>${esc(p.municipality)}</town>
      <province>${esc(p.district ?? "")}</province>
      <country>Portugal</country>
    </address>
    <description><![CDATA[${p.description ?? p.shortDescription ?? p.title}]]></description>
    <url>${SITE}/imovel/${esc(p.id)}</url>
    <images>
${imgs}
    </images>
  </property>`;
}

/** Feed XML (Idealista/Imovirtual) dos imóveis dados. */
export function propertiesToIdealistaXML(props: Property[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Feed HousePro compatível com Idealista/Imovirtual -->
<properties>
${props.map(propertyXML).join("\n")}
</properties>`;
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV de catálogo "home listings" do Facebook/Meta. */
export function propertiesToFacebookCSV(props: Property[]): string {
  const headers = [
    "home_listing_id", "name", "description", "availability", "price", "currency",
    "url", "image[0].url", "address.addr1", "address.city", "address.region",
    "address.country", "property_type", "listing_type", "num_beds", "num_baths", "area_size", "area_unit",
  ];
  const rows = props.map((p) => [
    p.reference || p.id,
    p.title,
    p.shortDescription ?? p.description ?? p.title,
    "for_sale",
    `${p.price} EUR`,
    "EUR",
    `${SITE}/imovel/${p.id}`,
    images(p)[0] ?? "",
    p.parish,
    p.municipality,
    p.district ?? "",
    "PT",
    (TYPE_MAP[p.type] ?? "other"),
    p.operation === "arrendamento" ? "for_rent_by_agent" : "for_sale_by_agent",
    p.beds,
    p.baths,
    p.area,
    "sq_m",
  ]);
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
