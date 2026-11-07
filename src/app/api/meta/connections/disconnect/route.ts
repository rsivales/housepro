import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectingAgent, metaAgentConfig, pageIdPattern } from "@/lib/meta/agent-pages";

export async function POST(request: Request) {
  const config = metaAgentConfig();
  const agent = await getConnectingAgent();
  if (!config || !agent || request.headers.get("origin") !== config.origin) return new Response(null, { status: 403 });
  const pageId = String((await request.formData()).get("pageId") ?? "");
  if (!pageIdPattern.test(pageId)) return new Response(null, { status: 400 });
  const { error } = await createAdminClient().from("meta_agent_pages")
    .update({ sealed_token: null, connected_at: null, setup_id: null })
    .eq("page_id", pageId).eq("agent_id", agent.id);
  return NextResponse.redirect(config.origin + "/app/meta?facebook=" + (error ? "erro" : "desligada"), 303);
}
