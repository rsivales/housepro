import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { portfolioSession } from "@/lib/portfolio/server";
import { ROLE_ORDER } from "@/lib/data/permissions";
export const dynamic = "force-dynamic";
async function allowed(write = false) {
  const s = await portfolioSession(write);
  return s &&
    (s.agent.roleKey === "admin" ||
      s.agent.roleKey === "superadmin" ||
      s.agent.role === "admin")
    ? s
    : null;
}
export async function GET() {
  if (!(await allowed()))
    return NextResponse.json(
      { error: "Reservado à administração da marca." },
      { status: 403 },
    );
  const { data, error } = await createAdminClient()
    .from("property_portfolio_permissions")
    .select("role_key,capabilities");
  if (error)
    return NextResponse.json(
      { error: "Falha ao ler permissões." },
      { status: 503 },
    );
  return NextResponse.json(
    {
      settings: Object.fromEntries(
        (data ?? []).map((r) => [r.role_key, r.capabilities]),
      ),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
export async function PUT(request: Request) {
  if (!(await allowed(true)))
    return NextResponse.json(
      { error: "Reservado à administração da marca." },
      { status: 403 },
    );
  const b = await request.json().catch(() => null);
  if (
    !b?.settings ||
    typeof b.settings !== "object" ||
    Array.isArray(b.settings)
  )
    return NextResponse.json(
      { error: "Permissões inválidas." },
      { status: 400 },
    );
  const rows = [];
  for (const [role, value] of Object.entries(b.settings)) {
    if (
      !ROLE_ORDER.includes(role as (typeof ROLE_ORDER)[number]) ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
    const capabilities: Record<string, boolean> = {};
    for (const [key, enabled] of Object.entries(value)) {
      if (
        !["viewAgency", "editAgency", "approveAgency", "duplicate"].includes(
          key,
        ) ||
        typeof enabled !== "boolean"
      )
        return NextResponse.json(
          { error: "Capacidade inválida." },
          { status: 400 },
        );
      capabilities[key] = enabled;
    }
    rows.push({
      role_key: role,
      capabilities,
      updated_at: new Date().toISOString(),
    });
  }
  const { error } = await createAdminClient()
    .from("property_portfolio_permissions")
    .upsert(rows, { onConflict: "role_key" });
  return error
    ? NextResponse.json({ error: "Falha ao guardar." }, { status: 503 })
    : NextResponse.json({ ok: true });
}
