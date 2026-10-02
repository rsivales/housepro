"use client";

import * as React from "react";
import { loadSiteContent } from "@/lib/data/site-content";

export function ManagedSiteImage({ assetKey, fallback, fallbackAlt, className, loading = "lazy", style }: {
  assetKey: string;
  fallback: string;
  fallbackAlt: string;
  className?: string;
  loading?: "eager" | "lazy";
  style?: React.CSSProperties;
}) {
  const [asset, setAsset] = React.useState({ url: fallback, alt: fallbackAlt });
  React.useEffect(() => {
    loadSiteContent().then((content) => {
      const override = content.mediaassets?.[assetKey];
      if (override) setAsset({ url: override.url || fallback, alt: override.alt || fallbackAlt });
    });
  }, [assetKey, fallback, fallbackAlt]);
  return <img src={asset.url} alt={asset.alt} className={className} loading={loading} style={style} />;
}
