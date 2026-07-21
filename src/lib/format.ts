import type { Property } from "./data/types";

const eur = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Sale price as "€685.000"; rental adds "/mês". */
export function formatPrice(property: Pick<Property, "price" | "operation">) {
  const value = eur.format(property.price);
  return property.operation === "arrendamento" ? `${value}/mês` : value;
}

export function formatArea(area: number) {
  return `${new Intl.NumberFormat("pt-PT").format(area)} m²`;
}

/** €1.064 (no cents). */
export function formatEuro(value: number) {
  return eur.format(Math.round(value || 0));
}

/** Formats a calc line value by kind (money / percent / number). */
export function formatCalc(value: number, kind?: "money" | "percent" | "number") {
  if (kind === "percent") return `${(value * 100).toFixed(1)}%`;
  if (kind === "number") return new Intl.NumberFormat("pt-PT").format(value);
  return formatEuro(value);
}

/**
 * Builds a wa.me click-to-chat URL with a message pre-filled with the
 * listing reference — the "WhatsApp por agente" requirement.
 */
export function whatsappLink(whatsapp: string, property: Pick<Property, "reference" | "title">) {
  const text = `Olá! Tenho interesse no imóvel ${property.reference} — "${property.title}". Pode dar-me mais informações?`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}
