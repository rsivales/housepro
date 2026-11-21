import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { authorizedAgency } from "@/lib/db/agency-finance";
import { EDITORIAL_2026 } from "@/lib/data/news-2026";
import { emailDeliveryCredentials } from "@/lib/email-delivery";

export const dynamic = "force-dynamic";
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function access(scope: string, agencyId: string | null, mutation: boolean) {
  const session = await getSession();
  if (!session || session.demo || (mutation && session.viewingAs) || !hasServiceRole()) return false;
  if (scope === "brand") return isNetworkFinanceAdmin(session.agent);
  if (scope !== "agency" || !agencyId) return false;
  try { await authorizedAgency(session.agent, agencyId); return true; } catch { return false; }
}

export async function GET(request: Request) {
  const agencyId = new URL(request.url).searchParams.get("agency");
  const scope = agencyId ? "agency" : "brand";
  if (!await access(scope, agencyId, false)) return error("Sem permissão.", 403);
  let q = createAdminClient().from("newsletter_campaigns").select("id,title,intro,status,article_ids,local_news_id,created_at,sent_at").eq("scope", scope).order("created_at", { ascending: false });
  if (agencyId) q = q.eq("agency_id", agencyId);
  const { data, error: dbError } = await q;
  if (dbError) return error("Fila indisponível.", 503);
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  const agencyId = typeof body?.agencyId === "string" ? body.agencyId : null;
  const scope = agencyId ? "agency" : "brand";
  if (!await access(scope, agencyId, true)) return error("Sem permissão.", 403);
  const db = createAdminClient();

  if (action === "queue") {
    if (!agencyId) return error("Selecione uma agência.", 422);
    const newsId = String(body?.newsId ?? "");
    const { data: agency } = await db.from("agencies").select("name,news,suspended").eq("id", agencyId).maybeSingle();
    if (!agency || agency.suspended) return error("Agência indisponível.", 404);
    const news = (Array.isArray(agency.news) ? agency.news : []).find((n: { id: string }) => n.id === newsId);
    if (!news?.title || !news?.body) return error("Publique a notícia local primeiro.", 422);
    const session = await getSession();
    const { error: insertError } = await db.from("newsletter_campaigns").insert({ scope, agency_id: agencyId, title: String(news.title).slice(0, 180), intro: `Novidades de ${agency.name}`, local_news_id: newsId, created_by: session?.agent.id, status: "queued" });
    return insertError ? error("Não foi possível colocar em fila.", 503) : NextResponse.json({ ok: true });
  }

  if (action !== "send") return error("Ação inválida.", 422);
  const campaignId = String(body?.id ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(campaignId)) return error("Edição inválida.", 422);
  const { data: campaign } = await db.from("newsletter_campaigns").select("*").eq("id", campaignId).eq("scope", scope).maybeSingle();
  if (!campaign || (agencyId && campaign.agency_id !== agencyId) || !["queued", "sending"].includes(campaign.status)) return error("Edição indisponível.", 409);

  const delivery = await emailDeliveryCredentials();
  if (!delivery.enabled || !delivery.sender || !delivery.apiKey) return error("Configure o Resend antes do envio.", 503);
  let agencyName = "";
  let localNews: { title: string; body: string; image?: string } | null = null;
  if (scope === "agency") {
    const { data: agency } = await db.from("agencies").select("name,news,suspended").eq("id", agencyId).maybeSingle();
    if (!agency || agency.suspended) return error("Agência indisponível.", 409);
    agencyName = agency.name;
    localNews = (Array.isArray(agency.news) ? agency.news : []).find((n: { id: string }) => n.id === campaign.local_news_id) ?? null;
    if (!localNews) return error("Notícia local já não existe.", 409);
  }

  if (campaign.status === "queued") {
    // A passagem condicional para 'sending' impede duas inicializações simultâneas.
    const { data: claimed } = await db.from("newsletter_campaigns").update({ status: "sending" }).eq("id", campaignId).eq("status", "queued").select("id").maybeSingle();
    if (!claimed) return error("O envio já foi iniciado. Atualize a fila.", 409);
    let offset = 0;
    while (true) {
      let q = db.from("marketing_subscriptions").select("email").eq("news", true).not("confirmed_at", "is", null).is("unsubscribed_at", null).order("email").range(offset, offset + 499);
      if (agencyId) q = q.eq("agency_id", agencyId);
      const { data: subscribers, error: subscriberError } = await q;
      if (subscriberError) return error("Não foi possível preparar os destinatários.", 503);
      if (subscribers?.length) {
        const { error: snapshotError } = await db.from("newsletter_deliveries").upsert(subscribers.map(s => ({ campaign_id: campaignId, email: s.email })), { onConflict: "campaign_id,email", ignoreDuplicates: true });
        if (snapshotError) return error("Não foi possível preparar a fila de envios.", 503);
      }
      if (!subscribers || subscribers.length < 500) break;
      offset += 500;
    }
    const { count: recipients } = await db.from("newsletter_deliveries").select("email", { count: "exact", head: true }).eq("campaign_id", campaignId);
    if (!recipients) {
      await db.from("newsletter_campaigns").update({ status: "queued" }).eq("id", campaignId).eq("status", "sending");
      return error("Ainda não há subscritores confirmados para esta edição. A campanha mantém-se em fila.", 409);
    }
  }

  const { data: pending, error: queueError } = await db.from("newsletter_deliveries").select("email").eq("campaign_id", campaignId).eq("status", "pending").order("email").limit(25);
  if (queueError) return error("Fila temporariamente indisponível.", 503);
  let sent = 0;
  const articles = (campaign.article_ids as string[]).map(id => EDITORIAL_2026.find(a => a.id === id)).filter((a): a is (typeof EDITORIAL_2026)[number] => Boolean(a));
  const cards = localNews
    ? `<article>${localNews.image?.startsWith("https://") ? `<img src="${escapeHtml(localNews.image)}" alt="" width="560" style="width:100%;height:auto;border-radius:12px"/>` : ""}<h2>${escapeHtml(localNews.title)}</h2><p style="white-space:pre-line">${escapeHtml(localNews.body)}</p></article>`
    : articles.map(a => `<article style="padding:16px 0;border-bottom:1px solid #eee"><img src="https://housepro.pt${a.image}" alt="" width="560" style="width:100%;height:auto;border-radius:12px"/><h2 style="font-size:19px">${escapeHtml(a.title)}</h2><p>${escapeHtml(a.excerpt)}</p><a href="https://housepro.pt/noticias/${encodeURIComponent(a.id)}">Ler análise completa</a></article>`).join("");
  if (!cards) return error("Edição sem conteúdo.", 422);
  for (const row of pending ?? []) {
    // Nova consulta imediatamente antes do envio: cancelamentos posteriores à criação da fila são respeitados.
    let eligible = db.from("marketing_subscriptions").select("email").eq("email", row.email).eq("news", true).not("confirmed_at", "is", null).is("unsubscribed_at", null);
    if (agencyId) eligible = eligible.eq("agency_id", agencyId);
    const { data: subscriber } = await eligible.maybeSingle();
    if (!subscriber) { await db.from("newsletter_deliveries").delete().eq("campaign_id", campaignId).eq("email", row.email); continue; }
    const idempotency = createHash("sha256").update(`${campaignId}:${row.email}`).digest("hex");
    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { authorization: `Bearer ${delivery.apiKey}`, "content-type": "application/json", "Idempotency-Key": `housepro-news/${idempotency}` },
        body: JSON.stringify({ from: delivery.sender, to: [row.email], subject: campaign.title,
          html: `<div style="max-width:600px;margin:auto;font:16px/1.55 Arial;color:#10213e"><img src="https://housepro.pt/brand/housepro-red.png" alt="HousePro" width="160"/><h1>${escapeHtml(campaign.title)}</h1><p>${escapeHtml(campaign.intro)}</p>${cards}<p style="margin-top:30px;font-size:12px">${agencyName ? escapeHtml(agencyName) + " · " : ""}HousePro · <a href="https://housepro.pt/subscrever/cancelar">Cancelar subscrição</a></p></div>`,
          text: `${campaign.title}\n\n${campaign.intro}\n\n${localNews ? localNews.body : articles.map(a => `${a.title}\nhttps://housepro.pt/noticias/${a.id}`).join("\n\n")}\n\nCancelar: https://housepro.pt/subscrever/cancelar` }),
        signal: AbortSignal.timeout(10000),
      });
      if (!result.ok) break;
      const payload = await result.json().catch(() => ({}));
      const { error: markError } = await db.from("newsletter_deliveries").update({ status: "sent", resend_id: payload.id ?? null, sent_at: new Date().toISOString() }).eq("campaign_id", campaignId).eq("email", row.email);
      if (markError) return error("Enviado; não foi possível guardar o recibo. Retome com a mesma chave de idempotência.", 503);
      sent++;
    } catch { break; }
  }
  const { count, error: countError } = await db.from("newsletter_deliveries").select("email", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
  if (countError) return error("Não foi possível consultar o estado.", 503);
  if (count === 0) await db.from("newsletter_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaignId);
  return NextResponse.json({ ok: true, sent, remaining: count, status: count === 0 ? "sent" : "sending" });
}
