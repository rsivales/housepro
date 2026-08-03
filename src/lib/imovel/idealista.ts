import type { ImovelDraft } from "./model";

/**
 * Exportação compatível com o feed de portais (Idealista / Imovirtual).
 * Mapeia os campos do carregamento HousePro para a estrutura XML do feed —
 * a via fiável de publicação nos portais (a API/push fica para o futuro).
 */

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

export function toIdealistaXML(d: ImovelDraft): string {
  const op = d.operation === "arrendamento" ? "rent" : "sale";
  const type = TYPE_MAP[d.type] ?? "flat";
  const features = [
    d.elevador && "elevator",
    d.estacionamento && "parking",
    d.rampa && "accessible",
    ...d.equipamentos,
  ].filter(Boolean) as string[];
  const images = Array.from(
    { length: d.fotosCount },
    (_, i) =>
      `https://www.housepro.pt/media/${d.reference || d.id}/foto-${i + 1}.jpg`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Feed compatível com Idealista/Imovirtual — gerado pelo HousePro -->
<properties>
  <property>
    <reference>${esc(d.reference || d.id)}</reference>
    <operation>${op}</operation>
    <propertyType>${type}</propertyType>
    <newDevelopment>${d.isDevelopment ? "true" : "false"}</newDevelopment>${
      d.isDevelopment
        ? `\n    <developmentName>${esc(d.developmentName ?? "")}</developmentName>` +
          `\n    <developmentStatus>${esc(d.developmentStage ?? "")}</developmentStatus>`
        : ""
    }
    <price currency="EUR">${d.price}</price>
    <surfaceArea unit="m2">${d.area}</surfaceArea>
    <rooms>${d.beds}</rooms>
    <bathrooms>${d.baths}</bathrooms>
    <typology>${esc(d.typology)}</typology>
    <constructionYear>${esc(d.anoConstrucao)}</constructionYear>
    <energyCertificate>${esc(d.energy)}</energyCertificate>
    <elevator>${d.elevador ? "true" : "false"}</elevator>
    <parking>${d.estacionamento ? "true" : "false"}</parking>
    <accessible>${d.rampa ? "true" : "false"}</accessible>
    <view>${esc(d.vista)}</view>
    <address>
      <parish>${esc(d.parish)}</parish>
      <municipality>${esc(d.municipality)}</municipality>
      <country>PT</country>${
        d.lat != null && d.lng != null
          ? `\n      <latitude>${d.lat}</latitude>\n      <longitude>${d.lng}</longitude>`
          : ""
      }
    </address>
    <shortDescription><![CDATA[${d.descricaoCurta}]]></shortDescription>
    <description language="pt"><![CDATA[${d.descricao}]]></description>
    <seo>
      <title>${esc(d.seoTitle)}</title>
      <slug>${esc(d.slug)}</slug>
      <metaDescription>${esc(d.seoDescription)}</metaDescription>
      <keywords>${esc(d.keywords)}</keywords>
    </seo>
    <community><![CDATA[${d.comunidade}]]></community>
    <features>
      ${features.map((f) => `<feature>${esc(f)}</feature>`).join("\n      ")}
    </features>
    <images>
      ${images.map((u, i) => `<image order="${i + 1}">${esc(u)}</image>`).join("\n      ")}
    </images>
    <documents>
      ${d.documentos
        .map(
          (doc) =>
            `<document type="${esc(doc.kind)}" validated="${doc.validated ? "true" : "false"}">${esc(doc.name)}</document>`
        )
        .join("\n      ")}${d.planta ? `\n      <document type="floorplan">planta.pdf</document>` : ""}
    </documents>
  </property>
</properties>`;
}
