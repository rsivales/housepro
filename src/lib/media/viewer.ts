/** Deteta se uma referência (nome, URL ou data URL) é um PDF — não confia só no
 *  mime guardado, porque alguns seletores de ficheiro (câmara/galeria móvel)
 *  deixam `file.type` vazio e esse valor pode ter ficado mal guardado em
 *  registos antigos. O nome/extensão do ficheiro é um sinal mais fiável. */
export function isPdfRef(name?: string, url?: string, mime?: string): boolean {
  if (mime === "application/pdf") return true;
  if (name && /\.pdf$/i.test(name)) return true;
  if (url) {
    if (url.startsWith("data:application/pdf")) return true;
    if (/\.pdf(\?|#|$)/i.test(url)) return true;
  }
  return false;
}

/** Abre um documento/planta num separador novo, no visualizador próprio da
 *  HousePro (com botão para fechar e voltar), em vez de confiar no
 *  visualizador nativo do navegador. */
export function openMediaViewer(url: string, name?: string) {
  if (typeof window === "undefined" || !url) return;
  const params = new URLSearchParams({ u: url });
  if (name) params.set("n", name);
  window.open(`/visualizar?${params.toString()}`, "_blank", "noopener,noreferrer");
}
