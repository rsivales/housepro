import type { Property } from "@/lib/data/types";

/**
 * Feed XML compatível com Idealista / Imovirtual para MÚLTIPLOS imóveis.
 * É a via fiável de publicação nos portais: o portal consome este endpoint
 * periodicamente. (O push pela API fica para produção, com credenciais.)
 */

const SITE = "https://www.housepro.pt";

const esc = (s: string) =>
  String(s ?? "").replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!
  );

const TYPE_MAP: Record<string, string> = {
  Apartamento: "flat",
  Moradia: "house",
  Terreno: "land",
  Loja: "premise",
  Escritório: "office",
};

function propertyXML(p: Property): string {
  const op = p.operation === "arrendamento" ? "rent" : "sale";
  const type = TYPE_MAP[p.type] ?? "flat";
  const gallery = p.gallery ?? [p.image];
  const images = gallery
    .map((src, i) => {
      const url = src.startsWith("http") ? src : `${SITE}${src}`;
      return `<image order="${i + 1}">${esc(url)}</image>`;
    })
    .join("\n        ");

  return `    <property>
      <reference>${esc(p.reference)}</reference>
      <url>${SITE}/imovel/${esc(p.id)}</url>
      <operation>${op}</operation>
      <propertyType>${type}</propertyType>
      <title><![CDATA[${p.title}]]></title>
      <price currency="EUR">${p.price}</price>
      <surfaceArea unit="m2">${p.area}</surfaceArea>
      <rooms>${p.beds}</rooms>
      <bathrooms>${p.baths}</bathrooms>
      <typology>${esc(p.typology ?? "")}</typology>
      <energyCertificate>${esc(p.energy)}</energyCertificate>
      <address>
        <parish>${esc(p.parish)}</parish>
        <municipality>${esc(p.municipality)}</municipality>
        <country>PT</country>
      </address>
      <images>
        ${images}
      </images>
    </property>`;
}

export function propertiesToFeedXML(properties: Property[]): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Feed HousePro compatível com Idealista/Imovirtual — gerado em ${now} -->
<properties generated="${now}" count="${properties.length}">
${properties.map(propertyXML).join("\n")}
</properties>`;
}
