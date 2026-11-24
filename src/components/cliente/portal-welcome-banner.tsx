"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, X } from "lucide-react";

export function PortalWelcomeBanner({ title, tips }: { title: string; tips: string[] }) {
  const router = useRouter();
  const [visible, setVisible] = React.useState(true);
  const [dismissing, setDismissing] = React.useState(false);

  async function dismiss() {
    setDismissing(true);
    setVisible(false);
    try {
      await fetch("/api/cliente/portal-onboarded", { method: "POST" });
      router.refresh();
    } finally {
      setDismissing(false);
    }
  }

  if (!visible) return null;

  return (
    <section className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-lg">
          <Sparkles className="size-5 text-primary" /> {title}
        </p>
        <button
          type="button"
          onClick={dismiss}
          disabled={dismissing}
          aria-label="Fechar"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {tips.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={dismiss}
        disabled={dismissing}
        className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        Entendido
      </button>
    </section>
  );
}
