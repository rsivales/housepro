import "server-only";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { emailDeliveryCredentials } from "@/lib/email-delivery";
import { houseproEmailShell } from "@/lib/email-template";
import { occasionsOnDate, OCCASION_LABEL, type OccasionKey } from "@/lib/data/holidays";
import { FONT_STACKS } from "@/lib/email/housepro-premium";

export type Audience = "clientes" | "consultores" | "brokers";

interface Recipient {
  id: string | null;
  name: string;
  email: string;
}

const renderName = (text: string, name: string) => text.replace(/\{nome\}/g, name);

/** Contactos com email, para o envio institucional a clientes. */
async function clientRecipients(): Promise<Recipient[]> {
  const sb = createAdminClient();
  const { data } = await sb.from("contacts").select("id,name,email").not("email", "is", null);
  return (data ?? [])
    .filter((r) => typeof r.email === "string" && r.email.includes("@"))
    .map((r) => ({ id: String(r.id), name: String(r.name ?? "Cliente"), email: String(r.email) }));
}

/** Consultores ativos (agente/agente_ami), excluindo quem já conta como broker. */
async function consultantRecipients(excludeIds: Set<string>): Promise<Recipient[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("profiles")
    .select("id,name,email")
    .eq("active", true)
    .in("role_key", ["agente", "agente_ami"])
    .not("email", "is", null);
  return (data ?? [])
    .filter((r) => typeof r.email === "string" && r.email.includes("@") && !excludeIds.has(String(r.id)))
    .map((r) => ({ id: String(r.id), name: String(r.name ?? "Consultor"), email: String(r.email) }));
}

/** Brokers (quem gere financeiramente uma agência) — distinto por perfil. */
async function brokerRecipients(): Promise<Recipient[]> {
  const sb = createAdminClient();
  const { data } = await sb.from("agency_finance_settings").select("broker:profiles!broker_id(id,name,email)").not("broker_id", "is", null);
  const seen = new Map<string, Recipient>();
  for (const row of data ?? []) {
    const b = (Array.isArray(row.broker) ? row.broker[0] : row.broker) as { id?: string; name?: string; email?: string } | null;
    if (b?.id && b.email?.includes("@")) seen.set(b.id, { id: b.id, name: b.name ?? "Broker", email: b.email });
  }
  return [...seen.values()];
}

async function audienceRecipients(audience: Audience): Promise<Recipient[]> {
  if (audience === "clientes") return clientRecipients();
  if (audience === "brokers") return brokerRecipients();
  const brokers = await brokerRecipients();
  return consultantRecipients(new Set(brokers.map((b) => b.id ?? "")));
}

/** Já enviado este ano a este destinatário, para esta ocasião/público? */
async function alreadySent(occasionKey: string, audience: string, year: number, email: string): Promise<boolean> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("institutional_send_log")
    .select("id")
    .eq("occasion_key", occasionKey)
    .eq("audience", audience)
    .eq("year", year)
    .eq("recipient_email", email.toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

async function logSent(occasionKey: string, audience: string, year: number, recipient: Recipient) {
  const sb = createAdminClient();
  await sb.from("institutional_send_log").insert({
    occasion_key: occasionKey,
    audience,
    year,
    recipient_id: recipient.id,
    recipient_email: recipient.email.toLowerCase(),
  });
}

async function sendOne(
  subject: string,
  body: string,
  imageUrl: string | null,
  fontFamily: string | null,
  bannerPosition: string | null,
  recipient: Recipient,
  eyebrow: string,
): Promise<boolean> {
  const delivery = await emailDeliveryCredentials();
  if (!delivery.enabled || !delivery.apiKey || !delivery.sender) return false;
  const personalSubject = renderName(subject, recipient.name);
  const banner = imageUrl ? `<img src="${imageUrl}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:10px;margin:0 0 24px">` : "";
  const bannerTop = bannerPosition === "meio" ? "" : banner;
  const bannerMiddle = bannerPosition === "meio" ? banner : "";
  const font = FONT_STACKS[fontFamily ?? "arial"] ?? FONT_STACKS.arial;
  const html = houseproEmailShell(
    personalSubject,
    `<div style="font-family:${font}">${bannerTop}<h1 style="font-size:24px;margin:0 0 20px">${personalSubject}</h1>${bannerMiddle}<div style="font-size:16px;line-height:1.7;white-space:pre-line">${renderName(body, recipient.name)}</div></div>`,
    eyebrow,
  );
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${delivery.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: delivery.sender, to: [recipient.email], subject: personalSubject, html }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function runOccasion(occasionKey: OccasionKey, year: number): Promise<{ sent: number; skipped: number }> {
  const sb = createAdminClient();
  const audiences: Audience[] = ["clientes", "consultores", "brokers"];
  let sent = 0, skipped = 0;
  for (const audience of audiences) {
    const { data: msg } = await sb
      .from("institutional_messages")
      .select("subject,body,image_url,font_family,banner_position,enabled")
      .eq("occasion_key", occasionKey)
      .eq("audience", audience)
      .maybeSingle();
    if (!msg?.enabled) continue;
    const recipients = await audienceRecipients(audience);
    for (const r of recipients) {
      if (await alreadySent(occasionKey, audience, year, r.email)) { skipped++; continue; }
      const ok = await sendOne(msg.subject, msg.body, msg.image_url ?? null, msg.font_family ?? null, msg.banner_position ?? null, r, `HOUSEPRO · ${OCCASION_LABEL[occasionKey].toUpperCase()}`);
      if (ok) { await logSent(occasionKey, audience, year, r); sent++; } else skipped++;
    }
  }
  return { sent, skipped };
}

/** Aniversário — por pessoa (contacto ou perfil), não por data fixa de calendário. */
async function runBirthdays(now: Date, year: number): Promise<{ sent: number; skipped: number }> {
  const sb = createAdminClient();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  let sent = 0, skipped = 0;

  const { data: msgs } = await sb
    .from("institutional_messages")
    .select("audience,subject,body,image_url,font_family,banner_position,enabled")
    .eq("occasion_key", "aniversario")
    .eq("enabled", true);
  for (const msg of msgs ?? []) {
    const audience = msg.audience as Audience;
    let candidates: Recipient[] = [];
    if (audience === "clientes") {
      const { data } = await sb.from("contacts").select("id,name,email,birth_date").not("birth_date", "is", null).not("email", "is", null);
      candidates = (data ?? [])
        .filter((r) => r.birth_date && new Date(`${r.birth_date}T00:00:00Z`).getUTCMonth() + 1 === month && new Date(`${r.birth_date}T00:00:00Z`).getUTCDate() === day && typeof r.email === "string")
        .map((r) => ({ id: String(r.id), name: String(r.name ?? "Cliente"), email: String(r.email) }));
    } else {
      const brokers = await brokerRecipients();
      const brokerIds = new Set(brokers.map((b) => b.id));
      const { data } = await sb.from("profiles").select("id,name,email,birth_date").eq("active", true).not("birth_date", "is", null).not("email", "is", null);
      candidates = (data ?? [])
        .filter((r) => r.birth_date && new Date(`${r.birth_date}T00:00:00Z`).getUTCMonth() + 1 === month && new Date(`${r.birth_date}T00:00:00Z`).getUTCDate() === day && typeof r.email === "string")
        .filter((r) => (audience === "brokers" ? brokerIds.has(String(r.id)) : !brokerIds.has(String(r.id))))
        .map((r) => ({ id: String(r.id), name: String(r.name ?? "Consultor"), email: String(r.email) }));
    }
    for (const r of candidates) {
      if (await alreadySent("aniversario", audience, year, r.email)) { skipped++; continue; }
      const ok = await sendOne(msg.subject, msg.body, msg.image_url ?? null, msg.font_family ?? null, msg.banner_position ?? null, r, "HOUSEPRO · ANIVERSÁRIO");
      if (ok) { await logSent("aniversario", audience, year, r); sent++; } else skipped++;
    }
  }
  return { sent, skipped };
}

/** Corre os envios institucionais do dia: ocasiões sazonais + aniversários. */
export async function runInstitutionalSends(now: Date = new Date()): Promise<{ occasions: OccasionKey[]; sent: number; skipped: number }> {
  if (!hasServiceRole()) return { occasions: [], sent: 0, skipped: 0 };
  const year = now.getUTCFullYear();
  const occasions = occasionsOnDate(now);
  let sent = 0, skipped = 0;
  for (const key of occasions) {
    const r = await runOccasion(key, year);
    sent += r.sent;
    skipped += r.skipped;
  }
  const b = await runBirthdays(now, year);
  sent += b.sent;
  skipped += b.skipped;
  return { occasions, sent, skipped };
}
