import "dotenv/config";
import { fetchNordicFranceBulletin } from "./fetcher";
import { syncResorts } from "./sync";
import { disconnectDb } from "./db";
import { revalidateWebCache } from "./revalidate";
import { validateScrapeCoverage } from "./coverage";
import { notifyIngestionIssue } from "./notify";

function escapeGitHubActionsCommandValue(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A");
}

function emitGitHubWarning(message: string): void {
  const escaped = escapeGitHubActionsCommandValue(message);
  console.warn(`::warning title=ou-skier worker partial ingestion::${escaped}`);
}

async function main(): Promise<void> {
  console.log("🎿  ou-skier data ingestion worker starting…");
  const runStartedAt = new Date();
  const runDate = runStartedAt.toISOString();

  console.log("→ Fetching Nordic France snow bulletin…");
  const records = await fetchNordicFranceBulletin();

  if (records.length === 0) {
    throw new Error(
      "No records found in the bulletin. " +
        "The page structure may have changed — check the HTML selectors in fetcher.ts."
    );
  } else {
    console.log(`→ Parsed ${records.length} resort(s) from bulletin.`);
    const coverage = await validateScrapeCoverage(records);
    if (coverage.missingResorts.length === 0) {
      console.log(
        `→ Coverage check passed (${coverage.scrapedResortCount} scraped, ${coverage.expectedResortCount} recently active expected).`
      );
    } else {
      const message = coverage.message ?? "Coverage warning without details.";
      console.warn(`⚠  ${message}`);
      console.warn("⚠  Missing recently active resorts:");
      for (const resortName of coverage.missingResorts) {
        console.warn(`  - ${resortName}`);
      }
      emitGitHubWarning(message);

      try {
        await notifyIngestionIssue(
          [
            "ou-skier worker partial ingestion detected.",
            `Run date: ${runDate}.`,
            message,
            `Scraped resorts: ${coverage.scrapedResortCount}.`,
            `Recently active expected resorts: ${coverage.expectedResortCount}.`,
            `Missing resorts: ${coverage.missingResorts.join(", ")}.`,
          ].join(" ")
        );
      } catch (error) {
        console.warn("⚠  Failed to send ntfy notification:", error);
      }
    }

    await syncResorts(records);

    try {
      await revalidateWebCache();
    } catch (error) {
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
  .finally(disconnectDb);
