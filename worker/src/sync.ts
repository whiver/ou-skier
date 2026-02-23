import { getDb } from "./db";
import { ResortSnowData } from "./types";

/**
 * Upserts resort and snow record data into the database.
 *
 * For each item:
 *  1. Upserts the Resort by name (creates if not found, updates metadata if changed).
 *  2. Upserts the SnowRecord by (resortId, recordDate).
 */
export async function syncResorts(records: ResortSnowData[]): Promise<void> {
  const db = getDb();

  for (const record of records) {
    const resort = await db.resort.upsert({
      where: { name: record.name },
      create: {
        name: record.name,
        region: record.region,
        department: record.department,
        domainUrl: record.domainUrl,
      },
      update: {
        region: record.region ?? undefined,
        department: record.department ?? undefined,
        domainUrl: record.domainUrl ?? undefined,
      },
    });

    // Normalize recordDate to midnight UTC to avoid sub-day duplicates
    const recordDate = new Date(
      Date.UTC(
        record.recordDate.getUTCFullYear(),
        record.recordDate.getUTCMonth(),
        record.recordDate.getUTCDate()
      )
    );

    await db.snowRecord.upsert({
      where: {
        resortId_recordDate: {
          resortId: resort.id,
          recordDate,
        },
      },
      create: {
        resortId: resort.id,
        recordDate,
        openSlopes: record.openSlopes,
        totalSlopes: record.totalSlopes,
        snowDepthBase: record.snowDepthBase,
        snowDepthTop: record.snowDepthTop,
        freshSnow: record.freshSnow,
        notes: record.notes,
        sourceUrl: record.sourceUrl,
      },
      update: {
        openSlopes: record.openSlopes ?? undefined,
        totalSlopes: record.totalSlopes ?? undefined,
        snowDepthBase: record.snowDepthBase ?? undefined,
        snowDepthTop: record.snowDepthTop ?? undefined,
        freshSnow: record.freshSnow ?? undefined,
        notes: record.notes ?? undefined,
        sourceUrl: record.sourceUrl,
      },
    });
  }

  console.log(`✓ Synced ${records.length} resort record(s).`);
}
