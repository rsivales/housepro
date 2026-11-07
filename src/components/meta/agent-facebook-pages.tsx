import { listAgentPages, metaAgentConfig } from "@/lib/meta/agent-pages";

const messages: Record<string, string> = {
  ligada: "Página ligada ao teu perfil.",
  desligada: "Página desligada no Helix.",
  pagina: "O Facebook não devolveu essa Página. Confirma o ID e as permissões da tua conta.",
  titular: "Esta Página já está associada a outro consultor no Helix.",
  erro: "Não foi possível concluir a operação. Tenta novamente.",
};

export async function AgentFacebookPages({ agentId, status }: { agentId: string; status?: string }) {
  if (!metaAgentConfig()) return null;
  const pages = await listAgentPages(agentId).catch(() => null);
  return (
    <section className="mt-6 space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="font-medium">As minhas Páginas do Facebook</h2>
      {status && Object.prototype.hasOwnProperty.call(messages, status) && <p role="status">{messages[status]}</p>}
      {pages === null ? <p>As ligações estão temporariamente indisponíveis.</p> : (
        <>
          <p className="text-sm text-muted-foreground">Liga uma Página que geres no Facebook. As leads da Página entram no teu pipeline escolhido.</p>
          <form action="/api/meta/connections/connect" method="post" className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">ID da Página
              <input name="pageId" inputMode="numeric" pattern="[0-9]{1,32}" required className="rounded-md border bg-background p-2" />
            </label>
            <label className="grid gap-1 text-sm">Pipeline
              <select name="pipeline" className="rounded-md border bg-background p-2">
                <option value="proprietarios">Proprietários</option>
                <option value="compradores">Compradores</option>
              </select>
            </label>
            <button className="rounded-md bg-primary p-2 text-primary-foreground">Ligar com Facebook</button>
          </form>
          <ul className="space-y-2 text-sm">
            {pages.map((page) => (
              <li key={page.page_id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                <span>{page.page_name} · {page.pipeline} · {page.connected_at ? "Ligada" : "Desligada"}</span>
                {page.connected_at && (
                  <form action="/api/meta/connections/disconnect" method="post">
                    <input type="hidden" name="pageId" value={page.page_id} />
                    <button className="underline">Desligar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
