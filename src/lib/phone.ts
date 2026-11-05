/** Normaliza números introduzidos no website sem assumir o país do visitante. */
export function normalizeContactPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasInternationalPrefix = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (hasInternationalPrefix) return `+${digits.replace(/^00/, "")}`;
  return digits;
}
