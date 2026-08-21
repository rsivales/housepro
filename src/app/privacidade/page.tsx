import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { site, fullAddress } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidade (RGPD)",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-3xl sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tratamento de dados pessoais nos termos do RGPD (Regulamento (UE)
          2016/679).
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">Responsável pelo tratamento</h2>
            <p className="mt-1">
              {site.brand} — {site.legalName} (AMI {site.amiLicense}), {fullAddress}.
              Contacto do encarregado de proteção de dados: {site.email.dpo}.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Que dados recolhemos</h2>
            <p className="mt-1">
              Nome, contacto (telefone/email) e dados do imóvel que nos indicar
              nos formulários de avaliação, contacto ou pesquisa.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Finalidade e fundamento</h2>
            <p className="mt-1">
              Utilizamos os seus dados apenas para responder ao seu pedido e
              prestar o serviço solicitado, com base no seu consentimento e no
              interesse legítimo da relação pré-contratual.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Conservação</h2>
            <p className="mt-1">
              Conservamos os dados pelo período necessário à finalidade e pelos
              prazos legais aplicáveis à atividade de mediação imobiliária.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Os seus direitos</h2>
            <p className="mt-1">
              Pode aceder, retificar, apagar, limitar ou opor-se ao tratamento e
              solicitar a portabilidade dos seus dados, contactando
              dpo@housepro.pt. Tem ainda o direito de reclamar junto da CNPD.
            </p>
          </section>
          <p className="text-xs">
            As chamadas para os números dos consultores correspondem a chamadas
            para a rede móvel nacional.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
