"use client";

import { useState } from "react";
import {
  ResortDaySnowStat,
  ResortWeekAverageSnowStat,
} from "@/lib/snowStats";
import ResortDailySnowHeatmap from "@/components/ResortDailySnowHeatmap";
import ResortWeeklySnowHeatmap from "@/components/ResortWeeklySnowHeatmap";

export default function ResortSnowHeatmap({
  currentYearDays,
  allYearsWeeks,
  currentYear,
}: {
  currentYearDays: ResortDaySnowStat[];
  allYearsWeeks: ResortWeekAverageSnowStat[];
  currentYear: number;
}) {
  const [mode, setMode] = useState<"year" | "all">("year");

  if (currentYearDays.length === 0 && allYearsWeeks.length === 0) {
    return null;
  }

  const cardClassName =
    mode === "year"
      ? "inline-block rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      : "rounded-xl border border-gray-100 bg-white p-4 shadow-sm";

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          {mode === "year"
            ? `Couverture neige ${currentYear} (quotidien)`
            : "Couverture neige (toutes années, hebdo)"}
        </h2>

        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("year")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "year"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {currentYear}
          </button>
          <button
            type="button"
            onClick={() => setMode("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Toutes années
          </button>
        </div>
      </div>

      <div className={cardClassName}>
        {mode === "year" ? (
          <ResortDailySnowHeatmap days={currentYearDays} />
        ) : (
          <ResortWeeklySnowHeatmap
            weeks={allYearsWeeks}
            referenceYear={currentYear}
          />
        )}
      </div>
    </section>
  );
}
