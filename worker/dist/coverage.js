"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScrapeCoverage = validateScrapeCoverage;
const db_1 = require("./db");
const normalization_1 = require("./normalization");
const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_MINIMUM_KNOWN_RECORD_DAYS = 2;
function parsePositiveInteger(raw, fallback) {
    if (!raw)
        return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function getCoveragePolicy() {
    return {
        lookbackDays: parsePositiveInteger(process.env.ACTIVE_RESORT_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS),
        minimumKnownRecordDays: parsePositiveInteger(process.env.ACTIVE_RESORT_MIN_RECORD_DAYS, DEFAULT_MINIMUM_KNOWN_RECORD_DAYS),
    };
}
async function getExpectedRecentResorts(lookbackStart, minimumKnownRecordDays) {
    const db = (0, db_1.getDb)();
    return db.$queryRaw `
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
async function validateScrapeCoverage(records, runDate = new Date()) {
    const policy = getCoveragePolicy();
    const runDay = new Date(Date.UTC(runDate.getUTCFullYear(), runDate.getUTCMonth(), runDate.getUTCDate()));
    const lookbackStart = new Date(runDay);
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - policy.lookbackDays);
    const recentResorts = await getExpectedRecentResorts(lookbackStart, policy.minimumKnownRecordDays);
    const scrapedNames = new Set(records.map((record) => (0, normalization_1.normalizeResortName)(record.name)));
    const missingResorts = recentResorts
        .filter((resort) => !scrapedNames.has((0, normalization_1.normalizeResortName)(resort.name)))
        .map((resort) => resort.name);
    const summary = {
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
    const message = `Scrape coverage check found ${missingResorts.length} recently active resort(s) ` +
        `missing from today's bulletin: ${preview}${suffix}. ` +
        `Lookback=${policy.lookbackDays}d, minKnownDays=${policy.minimumKnownRecordDays}.`;
    summary.message = message;
    return summary;
}
