import Link from "next/link";

/**
 * RGPD consent checkbox for lead forms. Explicit, opt-in (unchecked by
 * default) and linked to the privacy policy, as required by the GDPR.
 */
export function ConsentField({ id = "rgpd" }: { id?: string }) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
    >
      <input
        id={id}
        name="rgpd"
        type="checkbox"
        required
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
      />
      <span>
        Autorizo o tratamento dos meus dados para ser contactado sobre este
        pedido, nos termos da{" "}
        <Link href="/privacidade" className="font-medium text-primary underline-offset-2 hover:underline">
          Política de Privacidade
        </Link>
        . (RGPD)
      </span>
    </label>
  );
}
