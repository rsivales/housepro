import { formatProjectPrice, type InternationalProject } from "@/lib/data/international";

export function ProjectFacts({ project, all = false }: { project: InternationalProject; all?: boolean }) {
  const { priceFrom, typologies, units, rates, amenities, deliveryYear, availability } = project;
  return (
    <div className="space-y-4">
      {priceFrom > 0 && <div>
        <p className="text-xs text-current/65">Preço desde</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{formatProjectPrice(project, priceFrom)}</p>
        {rates && <p className="mt-1 text-xs text-current/65">Conversão indicativa · {new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC" }).format(new Date(rates.date))}</p>}
      </div>}
      {units?.length ? <dl className="divide-y divide-current/15 border-y border-current/15 text-sm">
        {(all ? units : units.slice(0, 4)).map((unit, i) => <div key={`${unit.type}-${i}`} className="flex flex-wrap justify-between gap-x-3 py-2">
          <dt>{unit.type}</dt>
          <dd className="tabular-nums text-current/75">{unit.price === null ? "Sob consulta" : formatProjectPrice(project, unit.price)}</dd>
        </div>)}
      </dl> : typologies && <p className="text-sm">{typologies}</p>}
      {!!amenities?.length && <p className="text-sm leading-relaxed text-current/75">{(all ? amenities : amenities.slice(0, 4)).join(" · ")}</p>}
      {(deliveryYear || availability) && <p className="text-xs text-current/65">{[deliveryYear && `Entrega prevista em ${deliveryYear}`, availability].filter(Boolean).join(" · ")}</p>}
    </div>
  );
}

export function ProjectImage({ project, className, eager = false }: { project: InternationalProject; className: string; eager?: boolean }) {
  if (!project.photo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={project.photo} alt={project.photoAlt || project.title} className={className} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} />
  );
}
