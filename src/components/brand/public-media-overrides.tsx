"use client";

import * as React from "react";
import { PUBLIC_MEDIA } from "@/lib/data/public-media";
import { loadSiteContent } from "@/lib/data/site-content";

/** Applies Super Admin media choices to legacy landing-page images too. */
export function PublicMediaOverrides() {
  React.useEffect(() => {
    let observer: MutationObserver | undefined;
    loadSiteContent().then((content) => {
      const overrides = content.mediaassets;
      if (!overrides) return;
      const apply = () => {
        const pathname = window.location.pathname;
        for (const item of PUBLIC_MEDIA) {
          if (item.route !== pathname) continue;
          const override = overrides[item.key];
          if (!override?.url) continue;
          const names = [item.fallback, item.fallback.replace(/\.webp$/, ".png")];
          for (const image of document.querySelectorAll<HTMLImageElement>("img")) {
            const sourcePath = (() => { try { return new URL(image.src, window.location.origin).pathname; } catch { return image.getAttribute("src") ?? ""; } })();
            if (!names.includes(sourcePath)) continue;
            image.removeAttribute("srcset");
            image.removeAttribute("sizes");
            image.src = override.url;
            if (override.alt) image.alt = override.alt;
          }
        }
      };
      apply();
      observer = new MutationObserver(apply);
      observer.observe(document.body, { childList: true, subtree: true });
    });
    return () => observer?.disconnect();
  }, []);
  return null;
}
