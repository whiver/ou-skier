import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "@prisma/client";
import * as dbModule from "../db";
import { syncResorts } from "../sync";
import { isFromPreviousSkiSeason } from "../skiSeason";
import type { ResortSnowData } from "../types";

test("unchanged bulletins preserve their year through anniversaries and reruns", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-08T12:00:00Z") });
  t.mock.method(console, "log", () => {});

  let previousBulletin: {
    sourceRecordDate: Date;
    sourceBulletinHash: string;
  } | null = null;
  let dailyRecord: { id: number; createdAt: Date; recordDate: Date } | null = null;
  let written: Prisma.SnowRecordUncheckedCreateInput | null = null;

  const findFirst = t.mock.fn(async () => previousBulletin);
  const create = t.mock.fn(async ({ data }: { data: Prisma.SnowRecordUncheckedCreateInput }) => {
    assert.ok(data.sourceRecordDate instanceof Date);
    assert.ok(typeof data.sourceBulletinHash === "string");
    previousBulletin = {
      sourceRecordDate: data.sourceRecordDate,
      sourceBulletinHash: data.sourceBulletinHash,
    };
    written = data;
  });
  const update = t.mock.fn(async ({ data }: { data: Prisma.SnowRecordUncheckedUpdateInput }) => {
    assert.ok(data.sourceRecordDate instanceof Date);
    assert.deepEqual(data.sourceRecordDate, previousBulletin?.sourceRecordDate);
    assert.equal(data.sourceBulletinHash, previousBulletin?.sourceBulletinHash);
    assert.equal(data.openSlopes, 0);
    assert.equal(data.totalSlopes, 12);
  });
  t.mock.method(dbModule, "getDb", () => ({
    resort: {
      findUnique: async () => ({ id: 1 }),
      update: async () => ({ id: 1 }),
    },
    snowRecord: {
      findFirst,
      findUnique: async () => dailyRecord,
      create,
      update,
    },
  }));

  const record: ResortSnowData = {
    name: "Test resort",
    region: null,
    domainUrl: null,
    recordDate: new Date("2026-03-31T00:00:00Z"),
    openSlopes: 8,
    totalSlopes: 12,
    notes: "20 km",
    sourceUrl: "https://example.com/resort",
  };
  async function ingest(date: string, sourceDate: string, changes: Partial<ResortSnowData> = {}) {
    t.mock.timers.setTime(new Date(date).getTime());
    await syncResorts([{ ...record, recordDate: new Date(sourceDate), ...changes }]);
  }
  function expectWritten(sourceDate: string, openSlopes: number) {
    assert.ok(written);
    assert.deepEqual(written.sourceRecordDate, new Date(sourceDate));
    assert.deepEqual(written.recordDate, new Date(new Date().toISOString().slice(0, 10)));
    assert.equal(written.openSlopes, openSlopes);
    assert.equal(written.totalSlopes, 12);
  }

  await syncResorts([record]);
  expectWritten("2026-03-31T00:00:00Z", 0);
  await ingest("2027-03-30T12:00:00Z", "2026-03-31T00:00:00Z");
  expectWritten("2026-03-31T00:00:00Z", 0);
  await ingest("2027-03-31T12:00:00Z", "2027-03-31T00:00:00Z");
  expectWritten("2026-03-31T00:00:00Z", 0);

  dailyRecord = {
    id: 3,
    createdAt: new Date("2027-03-31T12:00:00Z"),
    recordDate: new Date("2027-03-31T00:00:00Z"),
  };
  await ingest("2027-03-31T15:00:00Z", "2027-03-31T00:00:00Z");
  assert.equal(update.mock.callCount(), 1);
  dailyRecord = null;

  await ingest("2028-03-31T12:00:00Z", "2028-03-31T00:00:00Z");
  expectWritten("2026-03-31T00:00:00Z", 0);
  await ingest("2028-03-31T15:00:00Z", "2028-03-31T00:00:00Z", { openSlopes: 9 });
  expectWritten("2028-03-31T00:00:00Z", 9);
  await ingest("2028-04-01T12:00:00Z", "2028-04-01T00:00:00Z");
  expectWritten("2028-04-01T00:00:00Z", 8);
  await ingest("2028-04-02T12:00:00Z", "2028-04-01T00:00:00Z");
  expectWritten("2028-04-01T00:00:00Z", 8);
  assert.equal(findFirst.mock.callCount(), 8);
});

test("ski seasons roll over on September 1, not January 1", () => {
  assert.equal(isFromPreviousSkiSeason(new Date("2026-08-31Z"), new Date("2026-09-01Z")), true);
  assert.equal(isFromPreviousSkiSeason(new Date("2026-09-01Z"), new Date("2027-03-31Z")), false);
  assert.equal(isFromPreviousSkiSeason(new Date("2026-12-30Z"), new Date("2027-01-01Z")), false);
  assert.equal(isFromPreviousSkiSeason(new Date("2027-03-31Z"), new Date("2027-08-31Z")), false);
});
