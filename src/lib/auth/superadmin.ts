export const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL ?? "housepro.brand@gmail.com").trim().toLowerCase();

export function isSuperadminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === SUPERADMIN_EMAIL);
}
