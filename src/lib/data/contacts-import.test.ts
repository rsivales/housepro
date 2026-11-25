import { describe, it, expect } from "vitest";
import { parseContactsCsv } from "./contacts-import";

describe("parseContactsCsv", () => {
  it("parses a basic CSV with PT headers", () => {
    const csv = "nome,telefone,email,tipo,zona\nAna Silva,912345678,ana@email.pt,comprador,Faro";
    const { rows, errors } = parseContactsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([{ name: "Ana Silva", phone: "912345678", email: "ana@email.pt", type: "comprador", zone: "Faro" }]);
  });

  it("accepts EN headers in any order", () => {
    const csv = "email,name\nb@x.com,Bruno";
    const { rows } = parseContactsCsv(csv);
    expect(rows).toEqual([{ name: "Bruno", email: "b@x.com" }]);
  });

  it("requires a name column", () => {
    const csv = "telefone,email\n912345678,a@x.com";
    const { rows, errors } = parseContactsCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("skips rows without a name but keeps the rest", () => {
    const csv = "nome,email\n,a@x.com\nCarla,c@x.com";
    const { rows, errors } = parseContactsCsv(csv);
    expect(rows).toEqual([{ name: "Carla", email: "c@x.com" }]);
    expect(errors.length).toBe(1);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'nome,zona\n"Silva, Ana","Faro, Algarve"';
    const { rows } = parseContactsCsv(csv);
    expect(rows).toEqual([{ name: "Silva, Ana", zone: "Faro, Algarve" }]);
  });

  it("uses semicolon separator when there's no comma", () => {
    const csv = "nome;telefone\nAna;912345678";
    const { rows } = parseContactsCsv(csv);
    expect(rows).toEqual([{ name: "Ana", phone: "912345678" }]);
  });
});
