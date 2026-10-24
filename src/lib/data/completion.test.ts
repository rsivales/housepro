import { describe, expect, it } from "vitest";
import { completionLabel, isCompleted } from "./completion";
import { publicPriceLabel } from "../format";

describe("public completed listing results", () => {
  const base = {status: "vendido" as const, listedAt: "2026-09-01", soldAt: "2026-12-01", cpcvAt: "2026-10-15"};
  it("advertises sale speed only below 45 days, using CPCV signing instead of the later deed date", () => {
    expect(completionLabel(base)).toBe("Vendido em 44 dias");
    expect(completionLabel({...base,cpcvAt:"2026-10-16"})).toBeNull();
    expect(completionLabel({...base,cpcvAt:"2026-10-17"})).toBeNull();
  });
  it("advertises rental speed only below 15 days", () => {
    expect(completionLabel({...base,status:"arrendado",soldAt:"2026-09-15"})).toBe("Arrendado em 14 dias");
    expect(completionLabel({...base,status:"arrendado",soldAt:"2026-09-16"})).toBeNull();
  });
  it("handles same-day, singular, missing, invalid and reversed dates", () => {
    expect(completionLabel({...base,cpcvAt:base.listedAt})).toBe("Vendido em 0 dias");
    expect(completionLabel({...base,cpcvAt:"2026-09-02"})).toBe("Vendido em 1 dia");
    for(const cpcvAt of [undefined,"invalid","2026-02-30","2026-08-31"]) expect(completionLabel({...base,cpcvAt})).toBeNull();
    expect(completionLabel({...base,status:"reservado"})).toBeNull();
  });
  it("counts calendar days across daylight saving changes", () => {
    expect(completionLabel({...base,listedAt:"2026-10-24",cpcvAt:"2026-10-26"})).toBe("Vendido em 2 dias");
  });
  it("does not substitute the deed date when CPCV is unknown", () => {
    expect(completionLabel({...base,cpcvAt:undefined,soldAt:"2026-09-10"})).toBeNull();
  });
  it("never discloses asking prices of sold and rented properties", () => {
    for(const status of ["vendido","arrendado"] as const) {
      expect(isCompleted(status)).toBe(true);
      expect(publicPriceLabel({price:455000,operation:"venda",status,priceVisible:true})).toBe("");
    }
    expect(publicPriceLabel({price:455000,operation:"venda",status:"cpcv"})).toBe("Preço sob consulta");
    expect(publicPriceLabel({price:455000,operation:"venda",status:"novo",priceVisible:false})).toBe("Preço sob consulta");
    expect(publicPriceLabel({price:455000,operation:"venda",status:null})).toContain("455");
  });
});
