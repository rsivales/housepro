"use client";

import * as React from "react";

import { track } from "@/lib/analytics";

/** Dispara o evento de visualização da página de imóvel (sem dados pessoais). */
import { recordEngagement } from "@/lib/portfolio/engagement";

export function PdpView({propertyId}:{propertyId?:string}) {
  React.useEffect(() => {
    track("pdp_view");
    if(propertyId)recordEngagement(propertyId,"view");
  }, [propertyId]);
  return null;
}
