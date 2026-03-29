"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fetcher_1 = require("./fetcher");
const sync_1 = require("./sync");
const db_1 = require("./db");
const revalidate_1 = require("./revalidate");
const coverage_1 = require("./coverage");
const notify_1 = require("./notify");
function escapeGitHubActionsCommandValue(value) {
    return value
        .replace(/%/g, "%25")
        .replace(/\r/g, "%0D")
        .replace(/\n/g, "%0A")
        .replace(/:/g, "%3A");
}
function emitGitHubWarning(message) {
    const escaped = escapeGitHubActionsCommandValue(message);
    console.warn(`::warning title=ou-skier worker partial ingestion::${escaped}`);
}
async function main() {
    console.log("🎿  ou-skier data ingestion worker starting…");
    const runStartedAt = new Date();
    const runDate = runStartedAt.toISOString();
    console.log("→ Fetching Nordic France snow bulletin…");
    const records = await (0, fetcher_1.fetchNordicFranceBulletin)();
    if (records.length === 0) {
        throw new Error("No records found in the bulletin. " +
            "The page structure may have changed — check the HTML selectors in fetcher.ts.");
    }
    else {
        console.log(`→ Parsed ${records.length} resort(s) from bulletin.`);
        const coverage = await (0, coverage_1.validateScrapeCoverage)(records);
        if (coverage.missingResorts.length === 0) {
            console.log(`→ Coverage check passed (${coverage.scrapedResortCount} scraped, ${coverage.expectedResortCount} recently active expected).`);
        }
        else {
            const message = coverage.message ?? "Coverage warning without details.";
            console.warn(`⚠  ${message}`);
            console.warn("⚠  Missing recently active resorts:");
            for (const resortName of coverage.missingResorts) {
                console.warn(`  - ${resortName}`);
            }
            emitGitHubWarning(message);
            try {
                await (0, notify_1.notifyIngestionIssue)([
                    "ou-skier worker partial ingestion detected.",
                    `Run date: ${runDate}.`,
                    message,
                    `Scraped resorts: ${coverage.scrapedResortCount}.`,
                    `Recently active expected resorts: ${coverage.expectedResortCount}.`,
                    `Missing resorts: ${coverage.missingResorts.join(", ")}.`,
                ].join(" "));
            }
            catch (error) {
                console.warn("⚠  Failed to send ntfy notification:", error);
            }
        }
        await (0, sync_1.syncResorts)(records);
        try {
            await (0, revalidate_1.revalidateWebCache)();
        }
        catch (error) {
            console.warn("⚠  Cache invalidation failed:", error);
        }
    }
    console.log("✅  Done.");
}
main()
    .catch((err) => {
    console.error("❌  Worker failed:", err);
    process.exitCode = 1;
})
    .finally(db_1.disconnectDb);
