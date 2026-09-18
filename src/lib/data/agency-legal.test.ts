import { describe, it, expect } from "vitest";

import { blankLegal, legalStatus } from "@/lib/data/agency-legal";

describe("legalStatus", () => {
  it("agência em branco está incompleta", () => {
    expect(legalStatus(blankLegal()).complete).toBe(false);
  });

  it("com todos os campos + docs + AMI válida fica conforme", () => {
    const st = legalStatus({
      amiLicense: "18746",
      amiExpires: "2099-01-01",
      nipc: "500000000",
      cae: "68311",
      legalEmail: "direcao@housepro.pt",
      docs: {
        ami_comprovativo: "data:,x",
        certidao_permanente: "data:,x",
        registo_comercial: "data:,x",
        seguro_rc: "data:,x",
      },
    });
    expect(st.complete).toBe(true);
    expect(st.amiExpired).toBe(false);
  });

  it("marca AMI fora de validade", () => {
    const st = legalStatus({ ...blankLegal(), amiExpires: "2000-01-01" });
    expect(st.amiExpired).toBe(true);
  });
});
