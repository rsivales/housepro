import { listPropertiesByAgent, listProperties } from "@/lib/db/repo";
import { propertiesToFacebookCSV } from "@/lib/imovel/feeds";

/**
 * Feed CSV público (catálogo "home listings" do Facebook/Meta). Configura-se no
 * Commerce Manager como fonte de dados agendada. ?agent=<id> limita ao
 * consultor; sem parâmetro, devolve a montra aprovada da rede.
 */
export async function GET(request: Request) {
  const agent = new URL(request.url).searchParams.get("agent");
  const props = agent ? await listPropertiesByAgent(agent) : await listProperties();
  const publicos = props.filter((p) => !p.approval || p.approval === "aprovado");
  return new Response(propertiesToFacebookCSV(publicos), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="housepro-facebook-catalog.csv"',
      "cache-control": "public, max-age=900",
    },
  });
}
