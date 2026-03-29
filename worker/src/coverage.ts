import { getDb } from "./db";
import { ResortSnowData } from "./types";
import { normalizeResortName } from "./normalization";

type RecentResortRow = {
  id: number;
  name: string;
  lastRecordDate: Date;
  knownRecordDays: bigint;
};

export interface CoverageValidationSummary {
  expectedResortCount: number;
  scrapedResortCount: number;
  missingResorts: string[];
  message: string | null;
}

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_MINIMUM_KNOWN_RECORD_DAYS = 2;

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getCoveragePolicy(): {
  lookbackDays: number;
  minimumKnownRecordDays: number;
} {
  return {
    lookbackDays: parsePositiveInteger(
      process.env.ACTIVE_RESORT_LOOKBACK_DAYS,
      DEFAULT_LOOKBACK_DAYS
    ),
    minimumKnownRecordDays: parsePositiveInteger(
      process.env.ACTIVE_RESORT_MIN_RECORD_DAYS,
      DEFAULT_MINIMUM_KNOWN_RECORD_DAYS
    ),
  };
}

async function getExpectedRecentResorts(
  lookbackStart: Date,
  minimumKnownRecordDays: number
): Promise<RecentResortRow[]> {
  const db = getDb();

  return db.$queryRaw<RecentResortRow[]>`
    SELECT
      r.id::int AS "id",
      r.name AS "name",
      MAX(sr."recordDate")::timestamp AS "lastRecordDate",
      COUNT(DISTINCT sr."recordDate")::bigint AS "knownRecordDays"
    FROM "Resort" r
    INNER JOIN "SnowRecord" sr ON sr."resortId" = r.id
    WHERE sr."recordDate" >= ${lookbackStart}::timestamp
    GROUP BY r.id, r.name
    HAVING COUNT(DISTINCT sr."recordDate") >= ${minimumKnownRecordDays}
    ORDER BY r.name ASC
  `;
}

export async function validateScrapeCoverage(
  records: ResortSnowData[],
  runDate = new Date()
): Promise<CoverageValidationSummary> {
  const policy = getCoveragePolicy();

  const runDay = new Date(
    Date.UTC(
      runDate.getUTCFullYear(),
      runDate.getUTCMonth(),
      runDate.getUTCDate()
    )
  );
  const lookbackStart = new Date(runDay);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - policy.lookbackDays);

  const recentResorts = await getExpectedRecentResorts(
    lookbackStart,
    policy.minimumKnownRecordDays
  );
  const scrapedNames = new Set(records.map((record) => normalizeResortName(record.name)));
  const missingResorts = recentResorts
    .filter((resort) => !scrapedNames.has(normalizeResortName(resort.name)))
    .map((resort) => resort.name);

  const summary: CoverageValidationSummary = {
    expectedResortCount: recentResorts.length,
    scrapedResortCount: records.length,
    missingResorts,
    message: null,
  };

  if (missingResorts.length === 0) {
    return summary;
  }

  const preview = missingResorts.slice(0, 10).join(", ");
  const suffix = missingResorts.length > 10 ? ` (+${missingResorts.length - 10} more)` : "";
  const message =
    `Scrape coverage check found ${missingResorts.length} recently active resort(s) ` +
    `missing from today's bulletin: ${preview}${suffix}. ` +
    `Lookback=${policy.lookbackDays}d, minKnownDays=${policy.minimumKnownRecordDays}.`;

  summary.message = message;
  return summary;
}