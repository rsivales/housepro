"use client";

import * as React from "react";

import { track } from "@/lib/analytics";

/** Dispara o evento de visualização da página de imóvel (sem dados pessoais). */
export function PdpView() {
  React.useEffect(() => {
    track("pdp_view");
  }, []);
  return null;
}
