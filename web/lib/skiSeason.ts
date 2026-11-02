// A ski season spans two calendar years (e.g. Nov 2026 → Apr 2027) and is
// identified by the year it ends in (here "2027"). The app switches to the next
// season on September 1st, so the past season stays visible over the summer.
const SEASON_ROLLOVER_MONTH = 8; // September (0-based)
const WINTER_START_MONTH = 10; // November (0-based)
const WINTER_END_MONTH_EXCLUSIVE = 4; // May (0-based)

export interface SkiSeason {
  /** Calendar year in which the season ends, used as the season label. */
  endYear: number;
  /** Full season period (rollover to rollover), used to separate seasons. */
  periodStart: Date;
  periodEnd: Date;
  /** Displayed winter window: Nov 1st (endYear - 1) → May 1st (endYear), exclusive. */
  winterStart: Date;
  winterEnd: Date;
}

export function getSkiSeasonByEndYear(endYear: number): SkiSeason {
  return {
    endYear,
    periodStart: new Date(Date.UTC(endYear - 1, SEASON_ROLLOVER_MONTH, 1)),
    periodEnd: new Date(Date.UTC(endYear, SEASON_ROLLOVER_MONTH, 1)),
    winterStart: new Date(Date.UTC(endYear - 1, WINTER_START_MONTH, 1)),
    winterEnd: new Date(Date.UTC(endYear, WINTER_END_MONTH_EXCLUSIVE, 1)),
  };
}

export function getSkiSeason(date = new Date()): SkiSeason {
  const year = date.getUTCFullYear();
  const endYear =
    date.getUTCMonth() >= SEASON_ROLLOVER_MONTH ? year + 1 : year;
  return getSkiSeasonByEndYear(endYear);
}
