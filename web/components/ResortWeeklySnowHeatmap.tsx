import { ResortWeekAverageSnowStat } from "@/lib/snowStats";

function getAverageClass(averageOpenDays: number): string {
  if (averageOpenDays <= 0) return "bg-emerald-100";
  if (averageOpenDays <= 1.5) return "bg-emerald-200";
  if (averageOpenDays <= 3.5) return "bg-emerald-300";
  if (averageOpenDays <= 5.5) return "bg-emerald-400";
  return "bg-emerald-500";
}

function getIsoWeekStart(year: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(week1Monday.getUTCDate() - jan4Day);

  const weekStart = new Date(week1Monday);
  weekStart.setUTCDate(weekStart.getUTCDate() + (isoWeek - 1) * 7);
  return weekStart;
}

function getMonthMarkers(
  weeks: ResortWeekAverageSnowStat[],
  referenceYear: number,
  rowsCount: number
): Array<{ index: number; label: string }> {
  const rawMarkers: Array<{ index: number; label: string }> = [];
  const seen = new Set<string>();

  weeks.forEach((week, index) => {
    const date = getIsoWeekStart(referenceYear, week.isoWeek);
    date.setUTCDate(date.getUTCDate() + 3);
    const markerKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (seen.has(markerKey)) return;

    seen.add(markerKey);
    rawMarkers.push({
      index: Math.floor(index / rowsCount),
      label: date.toLocaleDateString("fr-FR", { month: "short" }),
    });
  });

  const markers: Array<{ index: number; label: string }> = [];
  let lastIndex = -10;
  rawMarkers.forEach((marker) => {
    if (marker.index - lastIndex < 2) return;
    markers.push(marker);
    lastIndex = marker.index;
  });

  return markers;
}

function groupWeeks(weeks: ResortWeekAverageSnowStat[], rowsCount: number) {
  const columnsCount = Math.ceil(weeks.length / rowsCount);
  const columns: Array<Array<ResortWeekAverageSnowStat | null>> = Array.from(
    { length: columnsCount },
    () => Array.from({ length: rowsCount }, () => null)
  );

  weeks.forEach((week, index) => {
    const columnIndex = Math.floor(index / rowsCount);
    const rowIndex = index % rowsCount;
    columns[columnIndex][rowIndex] = week;
  });

  return columns;
}

export default function ResortWeeklySnowHeatmap({
  weeks,
  referenceYear,
}: {
  weeks: ResortWeekAverageSnowStat[];
  referenceYear: number;
}) {
  if (weeks.length === 0) return null;

  const rowsCount = 4;
  const columns = groupWeeks(weeks, rowsCount);
  const monthMarkers = getMonthMarkers(weeks, referenceYear, rowsCount);

  return (
    <div className="inline-block">
      <div className="relative mb-3 h-4">
        {monthMarkers.map((marker) => (
          <span
            key={`${marker.index}-${marker.label}`}
            className="absolute top-0 text-[11px] text-gray-400"
              style={{ left: `${(marker.index / columns.length) * 100}%` }}
          >
            {marker.label}
          </span>
        ))}
      </div>

      <div>
        <div className="flex gap-2">
          {columns.map((column, columnIndex) => (
            <div key={`col-${columnIndex}`} className="grid grid-rows-4 gap-2">
              {column.map((week, rowIndex) => {
                if (!week) {
                  return <div key={`empty-${columnIndex}-${rowIndex}`} className="h-5 w-5" />;
                }

                const weekStart = getIsoWeekStart(referenceYear, week.isoWeek);
                const weekEnd = new Date(weekStart);
                weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

                const averageOpenDays = week.averageOpenDays;
                const unknown = averageOpenDays === null;
                const colorClass = unknown
                  ? "bg-gray-200"
                  : getAverageClass(averageOpenDays);
                const startLabel = weekStart.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                });
                const endLabel = weekEnd.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                });
                const tooltip = unknown
                  ? `Semaine ${week.isoWeek} (${startLabel} → ${endLabel}) : données insuffisantes`
                  : `Semaine ${week.isoWeek} (${startLabel} → ${endLabel}) : moyenne ${averageOpenDays.toFixed(1)}/7 jours avec au moins 1 piste ouverte (${week.sampleYears} année${week.sampleYears > 1 ? "s" : ""} avec données)`;

                return (
                  <div
                    key={`week-${week.isoWeek}`}
                    className={`h-5 w-5 rounded-sm ${colorClass}`}
                    title={tooltip}
                    aria-label={tooltip}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-gray-400">
        <span>Moins</span>
        <span className="h-4 w-4 rounded-sm bg-emerald-100" />
        <span className="h-4 w-4 rounded-sm bg-emerald-200" />
        <span className="h-4 w-4 rounded-sm bg-emerald-300" />
        <span className="h-4 w-4 rounded-sm bg-emerald-400" />
        <span className="h-4 w-4 rounded-sm bg-emerald-500" />
        <span>Plus</span>
        <span className="ml-2">Inconnu</span>
        <span className="h-4 w-4 rounded-sm bg-gray-200" />
      </div>
    </div>
  );
}
