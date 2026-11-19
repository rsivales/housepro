export const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
export function validFeeAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
}
export function currentFeeMonth(date = new Date()) {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit" }).format(date).split("-");
  return `${year}-${month}-01`;
}
export function validFeeMonth(value: unknown, now = currentFeeMonth()): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value) && value >= now;
}
