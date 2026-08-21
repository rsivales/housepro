"use client";

import * as React from "react";

import { PersonalMotivationBanner } from "./personal-banner";
import { ActionCenter, type ActionItem } from "./action-center";
import { LeadSummary, LatestAgencyProperty, type LatestProperty } from "./dashboard-cards";
import { ConsultantRhythm, type RhythmData } from "./consultant-rhythm";
import { CustomWidgetArea } from "./custom-widget-area";

export interface DashboardData {
  firstName: string;
  dateLabel: string;
  location?: string;
  temperature?: string;
  quote: string;
  faturacaoPct: number;
  angariacoes: { done: number; total: number };
  faltamEuros?: number;
  actions: ActionItem[];
  leads: { total: number; bySource: { source: string; count: number }[] };
  latestProperty: LatestProperty | null;
  rhythm: RhythmData;
}

/** Conteúdo do dashboard do consultor (dentro do escopo .helix + cabeçalho). */
export function ConsultantDashboard({ data }: { data: DashboardData }) {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 lg:py-6">
      <PersonalMotivationBanner
        firstName={data.firstName}
        dateLabel={data.dateLabel}
        location={data.location}
        temperature={data.temperature}
        quote={data.quote}
        faturacaoPct={data.faturacaoPct}
        angariacoes={data.angariacoes}
        faltamEuros={data.faltamEuros}
      />

      <ActionCenter items={data.actions} />

      <div className="grid gap-3 sm:grid-cols-2">
        <LeadSummary total={data.leads.total} bySource={data.leads.bySource} />
        <LatestAgencyProperty property={data.latestProperty} />
      </div>

      <ConsultantRhythm data={data.rhythm} />

      <CustomWidgetArea />
    </main>
  );
}
