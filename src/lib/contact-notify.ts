/**
 * Dispara (best-effort) a notificação de contacto ao consultor + direção quando
 * o cliente usa WhatsApp / SMS / chamada. keepalive garante o envio mesmo com a
 * navegação a abrir a app externa. Inclui os dados da conta do cliente, se houver.
 */
const CONTA_KEY = "housepro:conta";

type Conta = { nome?: string; email?: string; objetivo?: string };

export function notifyContact(
  channel: string,
  opts: { propertyId?: string; ref?: string }
) {
  let conta: Conta = {};
  try {
    conta = JSON.parse(localStorage.getItem(CONTA_KEY) || "{}") as Conta;
  } catch {
    conta = {};
  }
  try {
    void fetch("/api/contact-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        propertyId: opts.propertyId,
        ref: opts.ref,
        channel,
        clientName: conta.nome,
        clientEmail: conta.email,
        objetivo: conta.objetivo,
      }),
    }).catch(() => {});
  } catch {
    /* best-effort */
  }
}
