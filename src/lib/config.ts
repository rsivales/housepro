import type { OrderingRule } from "./data/ordering";

/**
 * Site configuration that, from Milestone 5, the admin/back office edits and
 * persists (Supabase). For now the default lives here and the /admin page
 * lets you preview a different rule live (guardado no browser).
 */
export const siteConfig = {
  /** Ordering rule for the homepage "Mais imóveis para si" section. */
  homeMoreRule: "recentes" as OrderingRule,
};

/** localStorage key the /admin toggle uses to override the rule per browser. */
export const HOME_RULE_KEY = "housepro:homeMoreRule";
