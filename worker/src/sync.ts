import { getDb } from "./db";
import { ResortSnowData } from "./types";
import { geocodeResort } from "./geocode";

/**
 * Upserts resort and snow record data into the database.
 *
 * For each item:
 *  1. Upserts the Resort by name (creates if not found, updates metadata if changed).
 *  2. Upserts the SnowRecord by (resortId, recordDate).
 */
export async function syncResorts(records: ResortSnowData[]): Promise<void> {
  const db = getDb();
  let createdResorts = 0;
  let geocodedResorts = 0;

  for (const record of records) {
    // Normalize recordDate to midnight UTC to avoid sub-day duplicates
    const recordDate = new Date(
      Date.UTC(
        record.recordDate.getUTCFullYear(),
        record.recordDate.getUTCMonth(),
        record.recordDate.getUTCDate()
      )
    );
    console.log(
      `→ New snow record to insert: ${record.name} (open/total: ${record.openSlopes ?? "n/a"}/${record.totalSlopes ?? "n/a"}, date: ${recordDate.toISOString()})`
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
        notes: record.notes,
        sourceUrl: record.sourceUrl,
      },
      update: {
        openSlopes: record.openSlopes ?? undefined,
        totalSlopes: record.totalSlopes ?? undefined,
        notes: record.notes ?? undefined,
        sourceUrl: record.sourceUrl,
      },
    });
  }

  console.log(`✓ Synced ${records.length} resort record(s).`);
  console.log(
    `→ New resorts: ${createdResorts} (geocoded: ${geocodedResorts})`
  );
}
