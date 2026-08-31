import { describe, it, expect } from "vitest";

import { GET, PUT } from "./route";
import { blankLegal, legalStatus } from "@/lib/data/agency-legal";

/**
 * Sem Supabase (ambiente de teste) a API responde persisted:false — o cliente
 * mantém o localStorage. Cobre também o cálculo do estado "conforme".
 */
describe("/api/brand/agency-legal — modo demo", () => {
  it("GET devolve config vazia e persisted false", async () => {
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.persisted).toBe(false);
    expect(json.config).toEqual({});
  });

  it("PUT não persiste sem Supabase", async () => {
    const res = await PUT(
      new Request("http://localhost/api/brand/agency-legal", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "porto", legal: blankLegal() }),
      })
    );
    expect((await res.json()).persisted).toBe(false);
  });
});

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
