import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getConnectingAgent, graph, metaAgentConfig, oauthCookie, pageIdPattern, sealPageToken } from "@/lib/meta/agent-pages";
import { createAdminClient } from "@/lib/supabase/admin";

type Page = { id: string; name: string; access_token?: string };
type Pages = { data?: Page[]; paging?: { next?: string; cursors?: { after?: string } } };

export async function GET(request: Request) {
  const config = metaAgentConfig();
  if (!config) return new Response(null, { status: 503 });
  const finish = (status: string) => {
    const response = NextResponse.redirect(config.origin + "/app/meta?facebook=" + status, 303);
    response.cookies.set(oauthCookie, "", { path: "/", maxAge: 0 });
    return response;
  };

  try {
    const agent = await getConnectingAgent();
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    const cookie = (await cookies()).get(oauthCookie)?.value;
    if (!agent || !code || !cookie) return finish("erro");
    const setup = JSON.parse(cookie) as { state: string; agentId: string; pageId: string; pipeline: string };
    if (!setup.state || setup.state !== params.get("state") || setup.agentId !== agent.id ||
        !pageIdPattern.test(setup.pageId) || !["compradores", "proprietarios"].includes(setup.pipeline)) {
      return finish("erro");
    }

    const user = await graph<{ access_token: string }>(config.version, "oauth/access_token", "", {
      client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.callback, code,
    });
    const extended = await graph<{ access_token: string }>(config.version, "oauth/access_token", "", {
      grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret,
      fb_exchange_token: user.access_token,
    });

    let page: Page | undefined;
    let after: string | undefined;
    for (let batch = 0; batch < 20; batch++) {
      const result: Pages = await graph(config.version, "me/accounts", extended.access_token, {
        fields: "id,name,access_token", limit: "100", ...(after ? { after } : {}),
      });
      page = result.data?.find((item) => item.id === setup.pageId);
      const next = result.paging?.next && result.paging.cursors?.after;
      if (page || !next || next === after) break;
      after = next;
    }
    if (!page?.access_token) return finish("pagina");

    const db = createAdminClient();
    const claim = await db.from("meta_agent_pages").upsert({
      page_id: page.id, page_name: page.name, agent_id: agent.id, pipeline: setup.pipeline,
    }, { onConflict: "page_id", ignoreDuplicates: true });
    if (claim.error) throw claim.error;
    const reserved = await db.from("meta_agent_pages").update({ setup_id: setup.state })
      .eq("page_id", page.id).eq("agent_id", agent.id).select("page_id").maybeSingle();
    if (reserved.error) throw reserved.error;
    if (!reserved.data) return finish("titular");

    const subscription = await graph<{ success?: boolean }>(config.version, page.id + "/subscribed_apps",
      page.access_token, { subscribed_fields: "leadgen" }, "POST");
    if (!subscription.success) return finish("erro");
    const saved = await db.from("meta_agent_pages").update({
      sealed_token: sealPageToken(page.access_token, config.key, page.id, agent.id),
      connected_at: new Date().toISOString(), setup_id: null, page_name: page.name, pipeline: setup.pipeline,
    }).eq("page_id", page.id).eq("agent_id", agent.id).eq("setup_id", setup.state).select("page_id").maybeSingle();
    return finish(!saved.error && saved.data ? "ligada" : "erro");
  } catch {
    return finish("erro");
  }
}
