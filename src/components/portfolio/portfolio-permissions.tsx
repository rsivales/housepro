"use client";
import { useEffect, useState } from "react";
import { ROLE_ORDER, ROLE_LABEL } from "@/lib/data/permissions";
import type { PermissionSettings } from "@/lib/portfolio/types";
const columns = [
  ["viewAgency", "Ver carteira da agência"],
  ["editAgency", "Editar imóveis da agência"],
  ["approveAgency", "Aprovar publicações"],
  ["duplicate", "Duplicar / criar frações"],
] as const;
function defaults(role: string, key: string) {
  return key === "duplicate"
    ? [
        "admin",
        "superadmin",
        "diretor",
        "coordenador",
        "agente",
        "agente_ami",
      ].includes(role)
    : ["admin", "superadmin", "diretor", "coordenador"].includes(role);
}
export function PortfolioPermissions() {
  const [settings, setSettings] = useState<PermissionSettings>({}),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    void fetch("/api/admin/portfolio-permissions", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setSettings(b.settings);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/portfolio-permissions", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setNotice(
        "Permissões guardadas no servidor. Aplicam-se à próxima operação.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 rounded-2xl border bg-card p-5">
      <h2 className="font-display text-xl">
        Gestão de imóveis · permissões reais
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Consultores gerem os seus imóveis e co-angariações. As capacidades
        abaixo permitem gerir a carteira da própria agência. Administração e
        Super Admin têm âmbito global; a direção/broker e os restantes papéis
        ficam limitados à sua agência. Agentes com AMI próprio podem aprovar os
        próprios imóveis.
      </p>
      {loaded && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead>
                <tr>
                  <th className="p-3">Papel</th>
                  {columns.map(([k, l]) => (
                    <th key={k} className="p-3 text-center">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_ORDER.map((role) => (
                  <tr key={role} className="border-t">
                    <th className="p-3 font-medium">{ROLE_LABEL[role]}</th>
                    {columns.map(([key, label]) => (
                      <td key={key} className="p-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${ROLE_LABEL[role]} · ${label}`}
                          checked={settings[role]?.[key] ?? defaults(role, key)}
                          onChange={(e) => {
                            setSettings((v) => ({
                              ...v,
                              [role]: {
                                ...v[role],
                                [key]: e.target.checked,
                                ...(e.target.checked &&
                                (key === "editAgency" ||
                                  key === "approveAgency")
                                  ? { viewAgency: true }
                                  : {}),
                                ...(!e.target.checked && key === "viewAgency"
                                  ? { editAgency: false, approveAgency: false }
                                  : {}),
                              },
                            }));
                            setNotice("");
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "A guardar…" : "Guardar permissões dos imóveis"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
    </section>
  );
}
