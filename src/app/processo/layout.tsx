/**
 * Processos — escopo visual Helix com VERDE em destaque (a cor das propostas
 * que dão origem ao processo). Recolore os tokens só nesta secção.
 */
export default function ProcessoLayout({ children }: { children: React.ReactNode }) {
  return <div className="helix helix-processos">{children}</div>;
}
