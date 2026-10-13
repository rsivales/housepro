"use client";
import * as React from "react";
import type { Agent, Agency } from "@/lib/data/types";

export function useDirectory() {
  const [directory, setDirectory] = React.useState<{ agents: Agent[]; agencies: Agency[] }>({ agents: [], agencies: [] });
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/directory", { signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error("directory_unavailable");
      return r.json();
    }).then(setDirectory).catch((e) => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, []);
  return { ...directory, error };
}
