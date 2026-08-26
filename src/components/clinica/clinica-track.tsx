"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

/** Dispara o evento de visualização da página (sem dados pessoais). */
export function ClinicaTrackView() {
  React.useEffect(() => { track("mv_page_view"); }, []);
  return null;
}
