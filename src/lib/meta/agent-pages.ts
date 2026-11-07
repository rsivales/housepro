import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";
import { getAppSecret } from "@/lib/meta/secrets";

export const pageIdPattern = /^\d{1,32}$/;
export const oauthCookie = "__Host-helix_meta_connect";

export function metaAgentConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = getAppSecret();
  const version = process.env.META_GRAPH_VERSION;
  const origin = process.env.META_AGENT_ORIGIN;
  const key = Buffer.from(process.env.META_AGENT_TOKEN_KEY ?? "", "base64");
  if (!appId || !pageIdPattern.test(appId) || !appSecret || !version || !/^v\d+\.\d+$/.test(version) || !origin || key.length !== 32) return null;
  const url = URL.canParse(origin) ? new URL(origin) : null;
  if (!url || url.protocol !== "https:" || url.origin !== origin) return null;
  return { appId, appSecret, version, origin, key, callback: origin + "/api/meta/connections/callback" };
}

export async function getConnectingAgent() {
  const session = await getSession();
  return session && !session.demo && !session.viewingAs ? session.agent : null;
}

export function sealPageToken(token: string, key: Buffer, pageId: string, agentId: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(pageId + ":" + agentId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function openPageToken(sealed: string, key: Buffer, pageId: string, agentId: string) {
  const [nonce, tag, encrypted] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(Buffer.from(pageId + ":" + agentId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function graph<T>(version: string, path: string, token: string, params: Record<string, string> = {}, method = "GET"): Promise<T> {
  const url = new URL("https://graph.facebook.com/" + version + "/" + path);
  const encoded = new URLSearchParams(params);
  if (method === "GET") url.search = encoded.toString();
  const response = await fetch(url, {
    method,
    headers: token ? { Authorization: "Bearer " + token } : undefined,
    body: method === "POST" ? encoded : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("meta_graph_request_failed");
  return response.json() as Promise<T>;
}

export async function listAgentPages(agentId: string) {
  const { data, error } = await createAdminClient().from("meta_agent_pages")
    .select("page_id,page_name,pipeline,connected_at").eq("agent_id", agentId).order("page_name");
  if (error) throw error;
  return data ?? [];
}
