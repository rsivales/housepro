import { expect, it } from "vitest";
import { isCommercialAgent } from "./agent-directory";

it("keeps real consultants selectable even when they also administer the brand", () => {
  expect(isCommercialAgent({ roleKey: "superadmin", publicTitle: "Consultor Imobiliário" })).toBe(true);
  expect(isCommercialAgent({ roleKey: "superadmin", publicTitle: "Consultora Imobiliária" })).toBe(true);
});
it("keeps brand-only administration separate from commercial agent lists", () => {
  expect(isCommercialAgent({ roleKey: "superadmin" })).toBe(false);
  expect(isCommercialAgent({ roleKey: "superadmin", publicTitle: " " })).toBe(false);
  expect(isCommercialAgent({ roleKey: "agente" })).toBe(true);
});
