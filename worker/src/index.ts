import "dotenv/config";
import { fetchNordicFranceBulletin } from "./fetcher";
import { syncResorts } from "./sync";
import { disconnectDb } from "./db";

async function main(): Promise<void> {
  console.log("🎿  ou-skier data ingestion worker starting…");

  console.log("→ Fetching Nordic France snow bulletin…");
  const records = await fetchNordicFranceBulletin();

  if (records.length === 0) {
    console.warn(
      "⚠  No records found in the bulletin. " +
        "The page structure may have changed — check the HTML selectors in fetcher.ts."
    );
  } else {
    console.log(`→ Parsed ${records.length} resort(s) from bulletin.`);
    await syncResorts(records);
  }

  console.log("✅  Done.");
}

main()
  .catch((err) => {
    console.error("❌  Worker failed:", err);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
