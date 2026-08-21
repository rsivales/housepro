"use client";

import * as React from "react";
import { ArrowRight, MapPin, Briefcase } from "lucide-react";

import { VACANCIES, type Vacancy } from "@/lib/data/careers";
import { readVacancies } from "@/lib/data/site-content";

/**
 * Lista de vagas abertas (carreiras). Hidrata a partir do admin (localStorage);
 * por defeito usa as vagas do projeto. Só mostra vagas ativas.
 */
export function VacancyList() {
  const [vacancies, setVacancies] = React.useState<Vacancy[]>(VACANCIES);

  React.useEffect(() => {
    setVacancies(readVacancies());
  }, []);

  const open = vacancies.filter((v) => v.active);

  if (open.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border bg-background p-6 text-center text-sm text-muted-foreground shadow-sm">
        De momento não há vagas abertas. Deixa a tua candidatura espontânea — falamos contigo assim que surgir uma oportunidade.
      </div>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-3">
      {open.map((v) => (
        <li
          key={v.id}
          className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-background p-5 shadow-sm sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-display text-lg">{v.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {v.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="size-4" /> {v.type}</span>
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{v.summary}</p>
          </div>
          <a
            href="#candidatura"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
            style={{ borderColor: "var(--border)" }}
          >
            Candidatar-me <ArrowRight className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  );
}
