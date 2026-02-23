import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Vercel Cron Job endpoint — ingests the latest Nordic France snow bulletin.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/ingest", "schedule": "0 7 * * *" }]
 * }
 *
 * Protected by CRON_SECRET env var to prevent unauthorized invocations.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fetchNordicFranceBulletin } = await import("@/lib/ingest/fetcher");
    const records = await fetchNordicFranceBulletin();

    if (records.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "No records found in bulletin",
        synced: 0,
      });
    }

    let synced = 0;
    for (const record of records) {
      const resort = await prisma.resort.upsert({
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

      const recordDate = new Date(
        Date.UTC(
          record.recordDate.getUTCFullYear(),
          record.recordDate.getUTCMonth(),
          record.recordDate.getUTCDate()
        )
      );

      await prisma.snowRecord.upsert({
        where: {
          resortId_recordDate: { resortId: resort.id, recordDate },
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

      synced++;
    }

    return NextResponse.json({ ok: true, synced });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { ok: false, error: "Ingestion failed" },
      { status: 500 }
    );
  }
}
