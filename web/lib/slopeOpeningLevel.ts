import type { Resort } from "@/types";

export type SlopeOpeningLevel = "green" | "yellow" | "red" | "unknown";

export function getSlopeOpeningLevel(resort: Resort): SlopeOpeningLevel {
  const latest = resort.snowRecords[0];

  if (!latest || latest.openSlopes === null) {
    return "unknown";
  }

  if (latest.openSlopes <= 0) {
    return "red";
  }

  if (latest.totalSlopes === null || latest.totalSlopes <= 0) {
    return "unknown";
  }

  const openRatio = latest.openSlopes / latest.totalSlopes;

  return openRatio >= 0.5 ? "green" : "yellow";
}
