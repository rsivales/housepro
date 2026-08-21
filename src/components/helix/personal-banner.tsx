"use client";

import * as React from "react";
import { Pencil, Upload, Trash2, Quote, Target, Check, ImageIcon, ThermometerSun } from "lucide-react";

const KEY = "helix:banner";

/** Fundos predefinidos (Deep Navy) para quem não carrega fotografia. */
const PRESETS: { id: string; label: string; css: string }[] = [
  { id: "navy", label: "Navy", css: "linear-gradient(135deg,#0B1F3A,#244765)" },
  { id: "dusk", label: "Entardecer", css: "linear-gradient(135deg,#0B1F3A 20%,#3478A5)" },
  { id: "ocean", label: "Oceano", css: "linear-gradient(135deg,#0B1F3A,#1B4B6B 70%,#3478A5)" },
];

interface Stored {
  photo?: string; // data URL
  preset?: string;
  posY?: number; // 0–100 object-position
}

function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

interface Props {
  firstName: string;
  dateLabel: string;
  location?: string;
  temperature?: string;
  quote: string;
  faturacaoPct: number;
  angariacoes: { done: number; total: number };
  faltamEuros?: number;
}

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function PersonalMotivationBanner(props: Props) {
  const [store, setStore] = React.useState<Stored>({});
  const [editing, setEditing] = React.useState(false);
  const [firstUse, setFirstUse] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStore(JSON.parse(raw));
      else setFirstUse(true);
    } catch {
      setFirstUse(true);
    }
  }, []);

  function save(next: Stored) {
    setStore(next);
    setFirstUse(false);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    save({ ...store, photo: await readFile(f), preset: undefined, posY: store.posY ?? 50 });
  }

  const bg = store.photo
    ? undefined
    : PRESETS.find((p) => p.id === store.preset)?.css ?? PRESETS[0].css;

  return (
    <section className="hx-banner relative overflow-hidden rounded-[var(--hx-radius)]" style={{ background: bg }}>
      {store.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={store.photo}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: `50% ${store.posY ?? 50}%` }}
        />
      )}
      {/* Gradiente Deep Navy para legibilidade. */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(105deg, rgba(11,31,58,0.92) 0%, rgba(11,31,58,0.72) 42%, rgba(11,31,58,0.28) 100%)" }}
      />

      <div className="relative p-5 text-white sm:p-6">
        <button
          onClick={() => setEditing((v) => !v)}
          aria-label="Personalizar banner"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        >
          <Pencil className="size-4" />
        </button>

        {firstUse ? (
          <div className="max-w-md py-2">
            <p className="text-lg font-bold">Personaliza o teu espaço</p>
            <p className="mt-1 text-sm text-white/85">
              Escolhe uma fotografia tua, da família, de um objetivo que queres
              alcançar, de um lugar que desejas visitar ou de algo que te inspire.
            </p>
            <button onClick={() => fileRef.current?.click()} className="hx-btn mt-3 bg-white text-[var(--hx-navy)]">
              <Upload className="size-4" /> Carregar fotografia
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-extrabold tracking-tight" style={{ fontSize: "clamp(1.6rem,5vw,2.1rem)" }}>
              Bom dia, {props.firstName}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-white/85">
              <span>{props.dateLabel}</span>
              {props.location && <span>· {props.location}</span>}
              {props.temperature && (
                <span className="inline-flex items-center gap-1">· <ThermometerSun className="size-3.5" /> {props.temperature}</span>
              )}
            </p>

            <p className="mt-3 flex items-start gap-2 text-sm italic text-white/90 sm:text-base">
              <Quote className="mt-0.5 size-4 shrink-0 opacity-70" /> {props.quote}
            </p>

            <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
              <Stat label="Faturação" value={`${props.faturacaoPct}%`} pct={props.faturacaoPct} />
              <Stat label="Angariações" value={`${props.angariacoes.done}/${props.angariacoes.total}`} pct={(props.angariacoes.done / Math.max(1, props.angariacoes.total)) * 100} />
            </div>

            {props.faltamEuros != null && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-white/85">
                <Target className="size-4" /> Faltam <strong className="hx-tnum">{eur(props.faltamEuros)}</strong> para o próximo objetivo
              </p>
            )}
          </>
        )}

        {editing && (
          <div className="relative mt-4 rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => fileRef.current?.click()} className="hx-btn bg-white/90 text-[var(--hx-navy)]"><Upload className="size-4" /> Carregar</button>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => save({ ...store, preset: p.id, photo: undefined })}
                  className="size-9 rounded-full border-2 border-white/40"
                  style={{ background: p.css }}
                  aria-label={p.label}
                >
                  {!store.photo && store.preset === p.id && <Check className="mx-auto size-4 text-white" />}
                </button>
              ))}
              {store.photo && (
                <button onClick={() => save({ preset: "navy" })} className="hx-btn bg-white/15 text-white"><Trash2 className="size-4" /> Remover</button>
              )}
            </div>
            {store.photo && (
              <label className="mt-3 flex items-center gap-2 text-xs text-white/80">
                <ImageIcon className="size-3.5" /> Reposicionar
                <input type="range" min={0} max={100} value={store.posY ?? 50} onChange={(e) => save({ ...store, posY: Number(e.target.value) })} className="flex-1" />
              </label>
            )}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
    </section>
  );
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="min-w-[7rem]">
      <p className="text-sm text-white/80">{label}</p>
      <p className="hx-tnum text-2xl font-bold leading-tight">{value}</p>
      <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: "#4C9BD6" }} />
      </div>
    </div>
  );
}
