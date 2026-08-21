"use client";

/**
 * Eventos de analytics SEM dados pessoais. Empurra para o dataLayer (GTM/GA4)
 * quando existir; caso contrário é no-op silencioso. Nunca enviar nome, email,
 * telefone, morada exata ou observações.
 */
export type AnalyticsEvent =
  | "valuation_page_view"
  | "valuation_cta_click"
  | "valuation_form_start"
  | "valuation_step1_complete"
  | "valuation_step2_complete"
  | "valuation_form_submit"
  | "valuation_form_error"
  | "valuation_testimonial_play"
  | "valuation_contact_click";

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

export function track(event: AnalyticsEvent, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  try {
    const w = window as DataLayerWindow;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...params });
  } catch {
    /* no-op */
  }
}
