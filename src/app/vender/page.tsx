import { permanentRedirect } from "next/navigation";

/**
 * Mantém os links antigos já divulgados, mas estabelece uma única página
 * canónica para avaliação e venda do imóvel.
 */
export default function VenderPage() {
  permanentRedirect("/avaliacao-imovel");
}
