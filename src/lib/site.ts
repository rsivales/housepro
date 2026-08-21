/**
 * Dados institucionais globais da HousePro. Fonte ÚNICA — usar em rodapés,
 * contactos, informação legal, metadata, dados estruturados e formulários,
 * para não duplicar (nem divergir) esta informação por vários componentes.
 */
export const site = {
  brand: "HousePro",
  legalName: "Tranquil Search Lda",
  amiLicense: "18746",
  address: {
    street: "Rua de Portugal, n.º 31",
    postalCode: "8000-281",
    city: "Faro",
    country: "Portugal",
    countryCode: "PT",
  },
  /** Emails no domínio da marca (não são números/placeholders fictícios). */
  email: {
    general: "geral@housepro.pt",
    dpo: "dpo@housepro.pt",
  },
  /** URL público. Em preview/produção vem de NEXT_PUBLIC_SITE_URL. */
  get url() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.housepro.pt";
  },
  social: {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    linkedin: "https://linkedin.com/",
  },
  livroReclamacoes: "https://www.livroreclamacoes.pt/",
} as const;

/** Morada completa numa linha (rodapé, contactos). */
export const fullAddress = `${site.address.street}, ${site.address.postalCode} ${site.address.city}`;

/** Identificação legal curta: denominação + AMI (rodapé/legal). */
export const legalLine = `${site.legalName} · AMI ${site.amiLicense}`;

/** PostalAddress para JSON-LD (schema.org). */
export const postalAddressJsonLd = {
  "@type": "PostalAddress",
  streetAddress: site.address.street,
  postalCode: site.address.postalCode,
  addressLocality: site.address.city,
  addressCountry: site.address.countryCode,
} as const;
