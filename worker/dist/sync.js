"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncResorts = syncResorts;
const db_1 = require("./db");
const geocode_1 = require("./geocode");
/**
 * Upserts resort and snow record data into the database.
 *
 * For each item:
 *  1. Upserts the Resort by name (creates if not found, updates metadata if changed).
 *  2. Upserts the SnowRecord by (resortId, recordDate).
 */
async function syncResorts(records) {
    const db = (0, db_1.getDb)();
    let createdResorts = 0;
    let geocodedResorts = 0;
    const runStartedAt = new Date();
    const ingestionRecordDate = new Date(Date.UTC(runStartedAt.getUTCFullYear(), runStartedAt.getUTCMonth(), runStartedAt.getUTCDate()));
    for (const record of records) {
        const sourceRecordDate = new Date(Date.UTC(record.recordDate.getUTCFullYear(), record.recordDate.getUTCMonth(), record.recordDate.getUTCDate()));
        console.log(`→ New snow record to insert: ${record.name} (open/total: ${record.openSlopes ?? "n/a"}/${record.totalSlopes ?? "n/a"}, source date: ${sourceRecordDate.toISOString()}, stored date: ${ingestionRecordDate.toISOString()})`);
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
                console.log(`→ New resort imported "${record.name}" (region: ${record.region ?? "n/a"}, domain: ${record.domainUrl ?? "n/a"}, notes: ${record.notes ?? "n/a"}, source: ${record.sourceUrl})`);
                const geocoded = await (0, geocode_1.geocodeResort)(record.name, record.region);
                if (geocoded) {
                    geocodedResorts += 1;
                    console.log(`→ Geocoded new resort "${record.name}" (${geocoded.source}) @ ${geocoded.latitude}, ${geocoded.longitude}`);
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
        const shouldRepairCreatedAt = existingSnowRecord.createdAt.getTime() ===
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
    console.log(`✓ Synced ${records.length} resort record(s).`);
    console.log(`→ New resorts: ${createdResorts} (geocoded: ${geocodedResorts})`);
}
