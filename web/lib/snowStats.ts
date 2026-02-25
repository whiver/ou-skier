import { prisma } from "@/lib/prisma";

export interface ResortWeekSnowStat {
  weekStart: string;
  weekEnd: string;
  openDays: number;
  knownDays: number;
}

export interface ResortWeekAverageSnowStat {
  isoWeek: number;
  averageOpenDays: number | null;
  sampleYears: number;
}

export type ResortDaySnowState = "open" | "closed" | "unknown";

export interface ResortDaySnowStat {
  dayDate: string;
  state: ResortDaySnowState;
}

function getCurrentSeasonBounds(now = new Date()): {
  seasonStart: Date;
  seasonEnd: Date;
} {
  const year = now.getUTCFullYear();

  return {
    seasonStart: new Date(Date.UTC(year, 0, 1)),
    seasonEnd: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

type WeeklySnowStatRow = {
  weekStart: Date;
  openDays: bigint;
  knownDays: bigint;
};

type DailySnowStatRow = {
  dayDate: Date;
  knownCount: bigint;
  openCount: bigint;
};

type RangeBounds = {
  rangeStart: Date;
  rangeEnd: Date;
};

async function getWeeklySnowStatsInRange(
  resortId: number,
  { rangeStart, rangeEnd }: RangeBounds
): Promise<ResortWeekSnowStat[]> {
  const rows = await prisma.$queryRaw<WeeklySnowStatRow[]>`
    WITH bounds AS (
      SELECT
        ${rangeStart}::timestamp AS range_start,
        ${rangeEnd}::timestamp AS range_end
    ),
    weeks AS (
      SELECT
        generate_series(
          date_trunc('week', (SELECT range_start FROM bounds)),
          date_trunc('week', (SELECT range_end FROM bounds) - interval '1 day'),
          interval '1 week'
        ) AS week_start
    )
    SELECT
      w.week_start::timestamp AS "weekStart",
      COUNT(sr.id) FILTER (WHERE sr."openSlopes" > 0) AS "openDays",
      COUNT(sr.id) FILTER (WHERE sr."openSlopes" IS NOT NULL) AS "knownDays"
    FROM weeks w
    LEFT JOIN "SnowRecord" sr
      ON sr."resortId" = ${resortId}
      AND sr."recordDate" >= (SELECT range_start FROM bounds)
      AND sr."recordDate" < (SELECT range_end FROM bounds)
      AND sr."recordDate" >= w.week_start
      AND sr."recordDate" < (w.week_start + interval '1 week')
    GROUP BY w.week_start
    ORDER BY w.week_start ASC
  `;

  return rows.map((row) => {
    const weekStart = row.weekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      openDays: Number(row.openDays),
      knownDays: Number(row.knownDays),
    };
  });
}

export async function getResortSeasonWeeklySnowStats(
  resortId: number,
  now = new Date()
): Promise<ResortWeekSnowStat[]> {
  const { seasonStart, seasonEnd } = getCurrentSeasonBounds(now);

  return getWeeklySnowStatsInRange(resortId, {
    rangeStart: seasonStart,
    rangeEnd: seasonEnd,
  });
}

export async function getResortCurrentYearDailySnowStats(
  resortId: number,
  now = new Date()
): Promise<ResortDaySnowStat[]> {
  const year = now.getUTCFullYear();
  const rangeStart = new Date(Date.UTC(year - 1, 10, 1));
  const rangeEnd = new Date(Date.UTC(year, 3, 1));

  const rows = await prisma.$queryRaw<DailySnowStatRow[]>`
    WITH bounds AS (
      SELECT
        ${rangeStart}::timestamp AS range_start,
        ${rangeEnd}::timestamp AS range_end
    ),
    days AS (
      SELECT
        generate_series(
          (SELECT range_start FROM bounds),
          (SELECT range_end FROM bounds) - interval '1 day',
          interval '1 day'
        ) AS day_date
    )
    SELECT
      d.day_date::timestamp AS "dayDate",
      COUNT(sr.id) FILTER (WHERE sr."openSlopes" IS NOT NULL) AS "knownCount",
      COUNT(sr.id) FILTER (WHERE sr."openSlopes" > 0) AS "openCount"
    FROM days d
    LEFT JOIN "SnowRecord" sr
      ON sr."resortId" = ${resortId}
      AND sr."recordDate" >= (SELECT range_start FROM bounds)
      AND sr."recordDate" < (SELECT range_end FROM bounds)
      AND sr."recordDate" >= d.day_date
      AND sr."recordDate" < (d.day_date + interval '1 day')
    GROUP BY d.day_date
    ORDER BY d.day_date ASC
  `;

  return rows.map((row) => {
    let state: ResortDaySnowState = "unknown";
    if (Number(row.knownCount) > 0) {
      state = Number(row.openCount) > 0 ? "open" : "closed";
    }

    return {
      dayDate: row.dayDate.toISOString(),
      state,
    };
  });
}

type FirstRecordDateRow = {
  minDate: Date | null;
};

type WeeklyAverageRow = {
  isoWeek: number;
  averageOpenDays: number | null;
  sampleYears: bigint;
};

export async function getResortAllYearsWeeklyAverageSnowStats(
  resortId: number,
  now = new Date()
): Promise<ResortWeekAverageSnowStat[]> {
  const firstRecord = await prisma.$queryRaw<FirstRecordDateRow[]>`
    SELECT MIN("recordDate")::timestamp AS "minDate"
    FROM "SnowRecord"
    WHERE "resortId" = ${resortId}
  `;

  const minDate = firstRecord[0]?.minDate;
  if (!minDate) return [];

  const startYear = minDate.getUTCFullYear();
  const currentYear = now.getUTCFullYear();
  const endYearExclusive = startYear < currentYear ? currentYear : currentYear + 1;
  const rangeStart = new Date(Date.UTC(startYear, 0, 1));
  const rangeEnd = new Date(Date.UTC(endYearExclusive, 0, 1));

  const rows = await prisma.$queryRaw<WeeklyAverageRow[]>`
    WITH per_year_week AS (
      SELECT
        EXTRACT(ISOYEAR FROM sr."recordDate")::int AS iso_year,
        EXTRACT(WEEK FROM sr."recordDate")::int AS iso_week,
        COUNT(sr.id) FILTER (WHERE sr."openSlopes" > 0) AS open_days,
        COUNT(sr.id) FILTER (WHERE sr."openSlopes" IS NOT NULL) AS known_days
      FROM "SnowRecord" sr
      WHERE sr."resortId" = ${resortId}
        AND sr."recordDate" >= ${rangeStart}::timestamp
        AND sr."recordDate" < ${rangeEnd}::timestamp
      GROUP BY iso_year, iso_week
    ),
    all_weeks AS (
      SELECT generate_series(1, 53) AS iso_week
    )
    SELECT
      w.iso_week::int AS "isoWeek",
      AVG(pyw.open_days::double precision) FILTER (WHERE pyw.known_days > 0) AS "averageOpenDays",
      COUNT(pyw.iso_year) FILTER (WHERE pyw.known_days > 0) AS "sampleYears"
    FROM all_weeks w
    LEFT JOIN per_year_week pyw ON pyw.iso_week = w.iso_week
    GROUP BY w.iso_week
    ORDER BY w.iso_week ASC
  `;

  return rows.map((row) => ({
    isoWeek: row.isoWeek,
    averageOpenDays: row.averageOpenDays,
    sampleYears: Number(row.sampleYears),
  }));
}
