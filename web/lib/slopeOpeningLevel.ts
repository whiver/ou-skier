import type { Resort } from "@/types";

export type SlopeOpeningLevel = "green" | "yellow" | "red" | "unknown";

/**
 * Maximum age of a snow record before it is considered stale and the resort
 * status falls back to "unknown".  Two days gives enough margin for the daily
 * worker run while still catching resorts whose data stopped being ingested.
 */
const STALENESS_THRESHOLD_DAYS = 2;
const STALENESS_THRESHOLD_MS =
  STALENESS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

export function getSlopeOpeningLevel(resort: Resort): SlopeOpeningLevel {
  const latest = resort.snowRecords[0];

  if (!latest || latest.openSlopes === null) {
    return "unknown";
  }

  const recordAge =
    new Date().getTime() - new Date(latest.recordDate).getTime();
  if (recordAge > STALENESS_THRESHOLD_MS) {
    return "unknown";
  }

  if (latest.openSlopes < 0) {
    return "unknown";
  }

  if (latest.openSlopes === 0) {
    return "red";
  }

  if (latest.totalSlopes === null || latest.totalSlopes <= 0) {
    return "unknown";
  }

  const openRatio = latest.openSlopes / latest.totalSlopes;

  return openRatio >= 0.5 ? "green" : "yellow";
}
