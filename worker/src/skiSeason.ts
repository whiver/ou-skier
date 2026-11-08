// Mirrors web/lib/skiSeason.ts: a season is identified by the year it ends in
// and rolls over on September 1st.
const SEASON_ROLLOVER_MONTH = 8; // September (0-based)

export function getSkiSeasonEndYear(date: Date): number {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= SEASON_ROLLOVER_MONTH ? year + 1 : year;
}

/**
 * True when the bulletin was last updated during an earlier ski season than
 * the reference date, meaning the resort has not reported anything yet for the
 * current season and its slope counts are leftovers from last winter.
 */
export function isFromPreviousSkiSeason(
  sourceDate: Date,
  referenceDate: Date
): boolean {
  return getSkiSeasonEndYear(sourceDate) < getSkiSeasonEndYear(referenceDate);
}
