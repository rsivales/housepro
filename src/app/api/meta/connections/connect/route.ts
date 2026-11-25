import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getConnectingAgent, metaAgentConfig, oauthCookie, pageIdPattern } from "@/lib/meta/agent-pages";

export async function POST(request: Request) {
  const config = metaAgentConfig();
  if (!config) return new Response("Integração Meta indisponível.", { status: 503 });
  if (request.headers.get("origin") !== config.origin) return new Response(null, { status: 403 });
  const agent = await getConnectingAgent();
  if (!agent) return new Response(null, { status: 403 });
  const form = await request.formData();
  const pageId = String(form.get("pageId") ?? "").trim();
  const pipeline = form.get("pipeline");
  if (!pageIdPattern.test(pageId) || (pipeline !== "compradores" && pipeline !== "proprietarios")) {
    return new Response("Indica o ID da Página e o pipeline.", { status: 400 });
  }

  const state = randomUUID();
  const url = new URL("https://www.facebook.com/" + config.version + "/dialog/oauth");
  url.search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.callback,
    state,
    response_type: "code",
    scope: "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_ads,leads_retrieval",
  }).toString();
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(oauthCookie, JSON.stringify({ state, agentId: agent.id, pageId, pipeline }), {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600,
  });
  return response;
}
