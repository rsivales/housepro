import { normalizeContactPhone } from "@/lib/phone";
export function validEmail(value: unknown): boolean { return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
/** Legacy email-only requests remain usable; anonymous clicks never enter operations. */
export function operationalLead(value: { contact?: unknown; email?: unknown; interaction_only?: unknown }): boolean {
 return value.interaction_only !== true && (validEmail(value.email) || validEmail(value.contact) || (typeof value.contact === "string" && /^[+\d\s().-]+$/.test(value.contact) && Boolean(normalizeContactPhone(value.contact))));
}
export function requestIdentity(name: unknown, phone: unknown, email: unknown) {
 const normalized = typeof phone === "string" && /^[+\d\s().-]+$/.test(phone) ? normalizeContactPhone(phone) : null;
 if(typeof name !== "string" || !name.trim() || name.trim().length>160 || !normalized || !validEmail(email)) return null;
 return { name:name.trim(), phone:normalized, email:String(email).trim().toLowerCase() };
}
