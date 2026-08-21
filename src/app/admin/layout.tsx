/**
 * Administração — aplica o escopo visual Helix (recolore os tokens do sistema
 * para a paleta Helix), para ficar uniforme com o resto da plataforma, sem
 * alterar a estrutura/navegação próprias do painel de administração.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="helix min-h-dvh">{children}</div>;
}
