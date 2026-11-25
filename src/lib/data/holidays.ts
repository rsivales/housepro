export type OccasionKey =
  | "natal"
  | "pascoa"
  | "carnaval"
  | "abril_25"
  | "halloween"
  | "santos_populares"
  | "dia_mae"
  | "dia_pai";

export const OCCASION_LABEL: Record<OccasionKey, string> = {
  natal: "Natal",
  pascoa: "Páscoa",
  carnaval: "Carnaval",
  abril_25: "25 de Abril",
  halloween: "Halloween",
  santos_populares: "Santos Populares",
  dia_mae: "Dia da Mãe",
  dia_pai: "Dia do Pai",
};

/** Domingo de Páscoa do ano (algoritmo de Gauss/anónimo, calendário gregoriano). */
export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=março, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** 1.º domingo de maio (Dia da Mãe, em Portugal). */
function firstSundayOfMay(year: number): Date {
  const d = new Date(Date.UTC(year, 4, 1));
  const offset = (7 - d.getUTCDay()) % 7;
  return addDays(d, offset);
}

/** Data (UTC, meia-noite) da ocasião nesse ano. */
export function occasionDate(key: OccasionKey, year: number): Date {
  switch (key) {
    case "natal":
      return new Date(Date.UTC(year, 11, 25));
    case "abril_25":
      return new Date(Date.UTC(year, 3, 25));
    case "halloween":
      return new Date(Date.UTC(year, 9, 31));
    case "santos_populares":
      return new Date(Date.UTC(year, 5, 13)); // Santo António
    case "dia_pai":
      return new Date(Date.UTC(year, 2, 19)); // São José
    case "dia_mae":
      return firstSundayOfMay(year);
    case "pascoa":
      return easterDate(year);
    case "carnaval":
      return addDays(easterDate(year), -47); // terça-feira de Carnaval
  }
}

/** Ocasiões cuja data cai exatamente no dia dado (comparação por ano/mês/dia, UTC). */
export function occasionsOnDate(date: Date): OccasionKey[] {
  const keys: OccasionKey[] = ["natal", "pascoa", "carnaval", "abril_25", "halloween", "santos_populares", "dia_mae", "dia_pai"];
  const year = date.getUTCFullYear();
  return keys.filter((k) => {
    const d = occasionDate(k, year);
    return d.getUTCFullYear() === year && d.getUTCMonth() === date.getUTCMonth() && d.getUTCDate() === date.getUTCDate();
  });
}
