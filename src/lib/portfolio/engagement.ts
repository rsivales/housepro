"use client";
/** Anonymous per-property 30-minute session; no IP/contact/user data is stored. */
export function recordEngagement(propertyId: string, kind: "view" | "contact") {
  try {
    const bucket = Math.floor(Date.now() / 1800000);
    const storageKey = `hp:engagement:${propertyId}:${kind}:${bucket}`;
    let key = sessionStorage.getItem(storageKey);
    if (key?.startsWith("sent:")) return;
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(storageKey, key);
    }
    void fetch("/api/properties/engagement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ propertyId, kind, key }),
      keepalive: true,
    })
      .then((r) => {
        if (r.ok) sessionStorage.setItem(storageKey, `sent:${key}`);
      })
      .catch(() => {});
  } catch {
    /* Analytics must not block browsing. */
  }
}
