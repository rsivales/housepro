import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { site, fullAddress } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidade (RGPD)",
};

const LAST_UPDATED = "23 de novembro de 2026";

export default function PrivacidadePage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-3xl sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tratamento de dados pessoais nos termos do Regulamento (UE)
          2016/679 (RGPD) e da Lei n.º 58/2019, de 8 de agosto, que assegura
          a sua execução em Portugal. Última atualização: {LAST_UPDATED}.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">Responsável pelo tratamento</h2>
            <p className="mt-1">
              {site.brand} — {site.legalName} (NIPC {site.nipc}, AMI{" "}
              {site.amiLicense}), com sede em {fullAddress}, é a entidade
              responsável pelo tratamento dos seus dados pessoais. Contacto
              geral: {site.email.general}.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">
              Encarregada de Proteção de Dados (EPD)
            </h2>
            <p className="mt-1">
              Nos termos do artigo 37.º do RGPD, designámos como Encarregada
              de Proteção de Dados {site.dpo.name}, que pode ser contactada
              diretamente através do email {site.dpo.email} para qualquer
              questão relacionada com o tratamento dos seus dados pessoais
              ou com o exercício dos seus direitos.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">Que dados recolhemos</h2>
            <p className="mt-1">
              Recolhemos apenas os dados que nos fornece diretamente, através
              dos formulários do site ou de contacto telefónico/email: nome,
              contacto (telefone e/ou email), e informação sobre o imóvel ou
              pedido em causa (por exemplo, localização, tipologia,
              orçamento ou mensagem). Não recolhemos categorias especiais de
              dados (artigo 9.º do RGPD).
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">Finalidade e fundamento</h2>
            <p className="mt-1">
              Utilizamos os seus dados para responder ao seu pedido, prestar
              o serviço de mediação imobiliária solicitado e, quando aplicável,
              cumprir obrigações legais e contratuais associadas à atividade
              (nomeadamente de faturação e arquivo). O fundamento é, conforme
              o caso: o seu consentimento, prestado de forma livre, específica
              e informada (quando assinala a casa de aceitação nos
              formulários), a execução de diligências pré-contratuais a seu
              pedido, ou o cumprimento de obrigações legais a que estamos
              sujeitos.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">
              Partilha de dados com terceiros
            </h2>
            <p className="mt-1">
              Os seus dados não são vendidos nem cedidos para fins de
              marketing de terceiros. Podem ser partilhados, na medida do
              estritamente necessário, com consultores da nossa equipa
              responsáveis pelo seu pedido e com prestadores de serviços que
              nos apoiam na operação do site e na gestão da atividade
              (como alojamento, email e CRM), sempre vinculados por contrato
              e por obrigações de confidencialidade e segurança equivalentes
              às aqui descritas. Caso algum destes prestadores processe
              dados fora do Espaço Económico Europeu, asseguramos a
              existência de garantias adequadas nos termos dos artigos 44.º
              a 49.º do RGPD.
            </p>
          </section>

          <section id="google-calendar">
            <h2 className="font-medium text-foreground">
              Integração com o Google Calendar
            </h2>
            <p className="mt-1">
              A plataforma Helix, usada pelos consultores {site.brand}, permite
              que cada consultor ligue, por iniciativa própria, a sua conta
              Google para enviar visitas, reuniões e tarefas para a sua
              agenda. Esta ligação só é feita com autorização expressa do
              consultor no ecrã de consentimento da Google e pode ser
              desligada a qualquer momento.
            </p>
            <p className="mt-2">
              Com essa autorização, o Helix acede apenas ao seguinte: (i) a
              lista das agendas de que o consultor é proprietário, para que
              escolha em qual quer receber os eventos; e (ii) a criação e
              atualização, nessa agenda, dos eventos que o consultor decide
              enviar a partir do Helix. O Helix não importa, não lê para
              outros fins nem altera os restantes eventos da agenda.
            </p>
            <p className="mt-2">
              Os eventos enviados podem incluir o tipo de marcação, data e
              hora, duração, local, referência do imóvel, nome do contacto e
              notas associadas. Estes dados passam a ficar também guardados
              na conta Google do consultor, sujeitos à política de
              privacidade da Google.
            </p>
            <p className="mt-2">
              A autorização de acesso concedida pela Google é guardada de
              forma cifrada e é usada exclusivamente para as funções acima.
              Os dados obtidos através das APIs da Google não são vendidos,
              não são usados para publicidade nem para treinar modelos de
              inteligência artificial e não são transferidos para terceiros,
              salvo quando necessário para prestar esta funcionalidade ou
              para cumprir uma obrigação legal. Ao desligar a conta no Helix,
              essa autorização é apagada dos nossos sistemas. O consultor
              pode também retirar o acesso em{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="font-medium text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
            <p className="mt-2">
              A utilização e a transferência, pelo Helix, de informação
              recebida das APIs da Google cumprem a{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="font-medium text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de Dados do Utilizador dos Serviços de API da Google
              </a>
              , incluindo os requisitos de Utilização Limitada (Limited Use).
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">Conservação</h2>
            <p className="mt-1">
              Conservamos os seus dados apenas durante o período necessário
              à finalidade para que foram recolhidos, ou pelos prazos legais
              mínimos aplicáveis à atividade de mediação imobiliária e à
              faturação, decorridos os quais são eliminados ou anonimizados.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">Os seus direitos</h2>
            <p className="mt-1">
              Pode, nos termos dos artigos 15.º a 22.º do RGPD, aceder,
              retificar, apagar ou limitar o tratamento dos seus dados,
              opor-se a esse tratamento e solicitar a portabilidade dos
              dados, bem como retirar o consentimento em qualquer momento,
              sem que isso comprometa a licitude do tratamento efetuado
              anteriormente. Para exercer estes direitos, contacte a nossa
              Encarregada de Proteção de Dados através de {site.dpo.email}.
              Respondemos no prazo de um mês, prorrogável nos casos previstos
              na lei.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">Menores de idade</h2>
            <p className="mt-1">
              Os nossos serviços destinam-se a maiores de 18 anos. Não
              recolhemos intencionalmente dados de menores sem o
              consentimento do seu representante legal.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">Segurança</h2>
            <p className="mt-1">
              Adotamos medidas técnicas e organizativas adequadas para
              proteger os seus dados contra acesso não autorizado, perda,
              alteração ou divulgação indevida.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">
              Direito de reclamação
            </h2>
            <p className="mt-1">
              Sem prejuízo de qualquer outra via de recurso administrativo
              ou judicial, tem o direito de apresentar reclamação à Comissão
              Nacional de Proteção de Dados (CNPD), através de{" "}
              <a
                href="https://www.cnpd.pt"
                className="font-medium text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.cnpd.pt
              </a>
              , caso considere que o tratamento dos seus dados viola o RGPD
              ou a Lei n.º 58/2019.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-foreground">
              Alterações a esta política
            </h2>
            <p className="mt-1">
              Podemos atualizar esta política para refletir alterações
              legais ou na nossa atividade. A data da última atualização
              está indicada no topo desta página.
            </p>
          </section>

          <p className="text-xs">
            As chamadas para os números dos consultores correspondem a
            chamadas para a rede móvel nacional.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
