"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, FileText, X } from "lucide-react";

import { isPdfRef } from "@/lib/media/viewer";

function Viewer() {
  const params = useSearchParams();
  const url = params.get("u") ?? "";
  const name = params.get("n") ?? "Documento";
  const [failed, setFailed] = React.useState(false);
  const pdf = isPdfRef(name, url);

  function close() {
    window.close();
    // Se o separador não foi aberto por script, close() é ignorado pelo
    // navegador — nesse caso, volta atrás em vez de ficar sem reação.
    window.setTimeout(() => {
      if (!window.closed) window.history.back();
    }, 150);
  }

  if (!url) {
    return (
      <div className="grid min-h-dvh place-items-center bg-neutral-900 text-sm text-white/70">
        Nenhum ficheiro para mostrar.
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-900">
      <header className="flex items-center justify-between gap-3 bg-neutral-950 px-4 py-3 text-white">
        <span className="min-w-0 truncate text-sm font-medium">{name}</span>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="size-3.5" /> Abrir ficheiro original
          </a>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div className="relative flex-1">
        {failed ? (
          <Fallback url={url} />
        ) : pdf ? (
          <object data={url} type="application/pdf" className="size-full" onError={() => setFailed(true)}>
            <Fallback url={url} />
          </object>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={name}
            className="mx-auto size-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}

function Fallback({ url }: { url: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/70">
      <FileText className="size-10" />
      <p>Não foi possível mostrar a pré-visualização aqui.</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="rounded-md bg-white/10 px-3 py-1.5 text-white hover:bg-white/20"
      >
        Abrir diretamente
      </a>
    </div>
  );
}

export default function VisualizarPage() {
  return (
    <React.Suspense fallback={null}>
      <Viewer />
    </React.Suspense>
  );
}
