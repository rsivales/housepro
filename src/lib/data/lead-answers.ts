/** The old valuation form stored its answers as a newline-delimited summary. */
export function valuationAnswers(message: string) {
  const [headline, ...lines] = message.split(/\r?\n/);
  const match = /^Pedido de avaliação — (.+), (.+)$/.exec(headline);
  if (!match) return [];
  const answers = [
    { label: "Tipo de imóvel", value: match[1] },
    { label: "Estado do imóvel", value: match[2] },
  ];
  for (const line of lines) {
    const field = /^([^:]+):\s*(.+)$/.exec(line);
    if (field) answers.push({ label: field[1], value: field[2] });
    else if (line.trim()) answers[answers.length - 1].value += `\n${line}`;
  }
  return answers;
}

export function contactWait(createdAt: string, now = Date.now()): string | undefined {
  const elapsed = now - Date.parse(createdAt);
  if (!Number.isFinite(elapsed)) return undefined;
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes === 0) return "menos de 1 minuto";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"}${hours % 24 ? ` e ${hours % 24} h` : ""}`;
}

export function websiteForm(source: string, subSource?: string | null, message?: string | null): string | undefined {
  if (source !== "site") return undefined;
  if (message?.startsWith("Pedido de avaliação — ")) return "Avaliação de imóvel";
  if (subSource === "Página de imóvel") return "Contacto ou pedido de visita na página do imóvel";
  if (subSource && !/^(Contacto via |Chamada identificada)/.test(subSource)) return subSource;
  return undefined;
}
