import * as React from "react";

import { cn } from "@/lib/utils";

/** HousePro house-mark. Uses currentColor so it inherits brand color. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <path
        d="M16 3.5 4 12.5V28h8v-8h8v8h8V12.5L16 3.5Z"
        className="fill-brand"
      />
      <path
        d="M20 20h-8v8"
        className="stroke-brand-accent"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">
        House<span className="text-brand">Pro</span>
      </span>
    </span>
  );
}
