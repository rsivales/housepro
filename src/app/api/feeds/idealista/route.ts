import { listPropertiesByAgent, listProperties } from "@/lib/db/repo";
import { propertiesToIdealistaXML } from "@/lib/imovel/feeds";

/**
 * Feed XML público (Idealista/Imovirtual). O portal subscreve este URL e
 * sincroniza automaticamente. ?agent=<id> limita ao consultor; sem parâmetro,
 * devolve a montra aprovada da rede.
 */
export async function GET(request: Request) {
  const agent = new URL(request.url).searchParams.get("agent");
  const props = agent ? await listPropertiesByAgent(agent) : await listProperties();
  const publicos = props.filter((p) => !p.approval || p.approval === "aprovado");
  return new Response(propertiesToIdealistaXML(publicos), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
}
