/** Sample records are only available in tests or explicitly opted-in local demos. */
export const DEMO_DATA_ENABLED = process.env.NODE_ENV === "test" ||
  (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true");
