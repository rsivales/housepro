import type { ContactType } from "@/lib/data/contacts";

export interface ImportRow {
  name: string;
  phone?: string;
  email?: string;
  type?: ContactType;
  zone?: string;
  budget?: string;
}

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  nome: "name",
  name: "name",
  telefone: "phone",
  phone: "phone",
  telemovel: "phone",
  email: "email",
  "e-mail": "email",
  tipo: "type",
  type: "type",
  zona: "zone",
  zone: "zone",
  orcamento: "budget",
  "orçamento": "budget",
  budget: "budget",
};

const TYPE_ALIASES: Record<string, ContactType> = {
  comprador: "comprador",
  buyer: "comprador",
  "proprietario": "vendedor",
  vendedor: "vendedor",
  seller: "vendedor",
  investidor: "investidor",
  investor: "investidor",
  recrutamento: "recrutamento",
  fornecedor: "fornecedor",
  outro: "outro",
  other: "outro",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Linha de CSV/TSV em campos, respeitando aspas simples (",", "campo com, vírgula"). */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parseia um ficheiro CSV (exportado do Excel/Google Sheets) para linhas de
 * contacto. Aceita cabeçalhos em PT ou EN, com ou sem acentos, em qualquer
 * ordem. Só "nome"/"name" é obrigatório — as restantes colunas são opcionais.
 * Função pura, testável.
 */
export function parseContactsCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const sep = text.includes(";") && !text.includes(",") ? ";" : text.split("\n")[0]?.includes("\t") ? "\t" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: ["Ficheiro vazio."] };

  const headerCells = splitLine(lines[0], sep).map((h) => stripAccents(h.toLowerCase().trim()));
  const columns = headerCells.map((h) => HEADER_ALIASES[h]);
  if (!columns.includes("name")) return { rows: [], errors: ["O ficheiro precisa de uma coluna \"nome\" (ou \"name\")."] };

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep);
    const row: Partial<ImportRow> = {};
    columns.forEach((field, idx) => {
      if (!field) return;
      const value = (cells[idx] ?? "").trim();
      if (!value) return;
      if (field === "type") {
        const t = TYPE_ALIASES[stripAccents(value.toLowerCase())];
        if (t) row.type = t;
      } else {
        row[field] = value;
      }
    });
    if (!row.name) {
      errors.push(`Linha ${i + 1}: sem nome — ignorada.`);
      continue;
    }
    rows.push(row as ImportRow);
  }
  return { rows, errors };
}
