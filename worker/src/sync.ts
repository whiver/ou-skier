import { getDb } from "./db";
import { ResortSnowData } from "./types";
import { geocodeResort } from "./geocode";

/**
 * Number of days to look back when identifying recently-active resorts that
 * are missing from the current scrape.  Resorts that had at least one record
 * with a non-null openSlopes value within this window will be backfilled with
 * an "unknown" record for today.
 */
const BACKFILL_LOOKBACK_DAYS = 7;

/**
 * Upserts resort and snow record data into the database.
 *
 * For each item:
 *  1. Upserts the Resort by name (creates if not found, updates metadata if changed).
 *  2. Upserts the SnowRecord by (resortId, recordDate).
 *
 * After processing all scraped records, any recently-active resort that did
 * *not* appear in the scrape receives a backfill record with null slopes so
 * that the front-end correctly reflects "unknown" instead of stale data.
 */
export async function syncResorts(records: ResortSnowData[]): Promise<void> {
  const db = getDb();
  let createdResorts = 0;
  let geocodedResorts = 0;
  const runStartedAt = new Date();
  const ingestionRecordDate = new Date(
    Date.UTC(
      runStartedAt.getUTCFullYear(),
      runStartedAt.getUTCMonth(),
      runStartedAt.getUTCDate()
    )
  );

  const syncedResortIds = new Set<number>();

  for (const record of records) {
    const sourceRecordDate = new Date(
      Date.UTC(
        record.recordDate.getUTCFullYear(),
        record.recordDate.getUTCMonth(),
        record.recordDate.getUTCDate()
      )
    );
    console.log(
      `→ New snow record to insert: ${record.name} (open/total: ${record.openSlopes ?? "n/a"}/${record.totalSlopes ?? "n/a"}, source date: ${sourceRecordDate.toISOString()}, stored date: ${ingestionRecordDate.toISOString()})`
    );

    const existingResort = await db.resort.findUnique({
      where: { name: record.name },
      select: { id: true },
    });

    const resort = existingResort
      ? await db.resort.update({
          where: { id: existingResort.id },
          data: {
            region: record.region ?? undefined,
            domainUrl: record.domainUrl ?? undefined,
          },
        })
      : await (async () => {
          createdResorts += 1;
          console.log(
            `→ New resort imported "${record.name}" (region: ${record.region ?? "n/a"}, domain: ${record.domainUrl ?? "n/a"}, notes: ${record.notes ?? "n/a"}, source: ${record.sourceUrl})`
          );
          const geocoded = await geocodeResort(record.name, record.region);

          if (geocoded) {
            geocodedResorts += 1;
            console.log(
              `→ Geocoded new resort "${record.name}" (${geocoded.source}) @ ${geocoded.latitude}, ${geocoded.longitude}`
            );
          }

          return db.resort.create({
            data: {
              name: record.name,
              region: record.region,
              domainUrl: record.domainUrl,
              latitude: geocoded?.latitude ?? null,
              longitude: geocoded?.longitude ?? null,
            },
          });
        })();

    syncedResortIds.add(resort.id);

    const existingSnowRecord = await db.snowRecord.findUnique({
      where: {
        resortId_recordDate: {
          resortId: resort.id,
          recordDate: ingestionRecordDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        recordDate: true,
      },
    });

    if (!existingSnowRecord) {
      await db.snowRecord.create({
        data: {
          resortId: resort.id,
          recordDate: ingestionRecordDate,
          openSlopes: record.openSlopes,
          totalSlopes: record.totalSlopes,
          notes: record.notes,
          sourceUrl: record.sourceUrl,
        },
      });

      continue;
    }

    const shouldRepairCreatedAt =
      existingSnowRecord.createdAt.getTime() ===
      existingSnowRecord.recordDate.getTime();

    await db.snowRecord.update({
      where: { id: existingSnowRecord.id },
      data: {
        openSlopes: record.openSlopes ?? undefined,
        totalSlopes: record.totalSlopes ?? undefined,
        notes: record.notes ?? undefined,
        sourceUrl: record.sourceUrl ?? undefined,
        ...(shouldRepairCreatedAt ? { createdAt: new Date() } : {}),
      },
    });
  }

  const backfilledCount = await backfillMissingResorts(
    db,
    syncedResortIds,
    ingestionRecordDate
  );

  console.log(`✓ Synced ${records.length} resort record(s).`);
  console.log(
    `→ New resorts: ${createdResorts} (geocoded: ${geocodedResorts})`
  );
  if (backfilledCount > 0) {
    console.log(
      `→ Backfilled ${backfilledCount} missing active resort(s) with unknown records.`
    );
  }
}

/**
 * Creates "unknown" (null-slopes) SnowRecords for recently-active resorts
 * that were not present in today's scrape.  This ensures the front-end sees a
 * record for today and can render "unknown" instead of showing stale data from
 * a previous day.
 */
async function backfillMissingResorts(
  db: ReturnType<typeof getDb>,
  syncedResortIds: Set<number>,
  ingestionRecordDate: Date
): Promise<number> {
  const lookbackStart = new Date(ingestionRecordDate);
  lookbackStart.setUTCDate(
    lookbackStart.getUTCDate() - BACKFILL_LOOKBACK_DAYS
  );

  const recentlyActiveResorts = await db.$queryRaw<
    Array<{ id: number; name: string }>
  >`
    SELECT DISTINCT r.id::int AS "id", r.name AS "name"
    FROM "Resort" r
    INNER JOIN "SnowRecord" sr ON sr."resortId" = r.id
    WHERE sr."recordDate" >= ${lookbackStart}::timestamp
      AND sr."openSlopes" IS NOT NULL
  `;

  let backfilledCount = 0;

  for (const resort of recentlyActiveResorts) {
    if (syncedResortIds.has(resort.id)) continue;

    const existing = await db.snowRecord.findUnique({
      where: {
        resortId_recordDate: {
          resortId: resort.id,
          recordDate: ingestionRecordDate,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      await db.snowRecord.create({
        data: {
          resortId: resort.id,
          recordDate: ingestionRecordDate,
          openSlopes: null,
          totalSlopes: null,
          notes: null,
          sourceUrl: null,
        },
      });
      backfilledCount += 1;
      console.log(
        `→ Backfilled missing resort "${resort.name}" with unknown record for ${ingestionRecordDate.toISOString()}`
      );
    }
  }

  return backfilledCount;
}
