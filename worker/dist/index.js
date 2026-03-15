"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fetcher_1 = require("./fetcher");
const sync_1 = require("./sync");
const db_1 = require("./db");
const revalidate_1 = require("./revalidate");
async function main() {
    console.log("🎿  ou-skier data ingestion worker starting…");
    console.log("→ Fetching Nordic France snow bulletin…");
    const records = await (0, fetcher_1.fetchNordicFranceBulletin)();
    if (records.length === 0) {
        console.warn("⚠  No records found in the bulletin. " +
            "The page structure may have changed — check the HTML selectors in fetcher.ts.");
    }
    else {
        console.log(`→ Parsed ${records.length} resort(s) from bulletin.`);
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
