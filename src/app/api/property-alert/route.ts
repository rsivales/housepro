import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const kind = body.kind === "personalized" ? "personalized" : "alert";
  const name = String(body.name ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !body.consent || (kind === "personalized" && !name)) return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("capture_property_lead", { payload: body });
  if (error || !data) {
    console.error("property_lead_capture_failed", { code: error?.code, message: error?.message });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = String(body.id ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!id || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_property_alert", { alert_id: id, alert_email: email });
  if (error || data !== true) return NextResponse.json({ error: "cancel_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
