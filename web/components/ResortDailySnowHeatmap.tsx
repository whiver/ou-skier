import { ResortDaySnowStat } from "@/lib/snowStats";

type DayCell = {
  dayDate: string;
  state: ResortDaySnowStat["state"];
};

function getDayStateClass(state: ResortDaySnowStat["state"]): string {
  if (state === "open") return "bg-emerald-500";
  if (state === "closed") return "bg-amber-200";
  return "bg-gray-200";
}

function getMonthMarkers(weeks: DayCell[][]): Array<{ index: number; label: string }> {
  const markers: Array<{ index: number; label: string }> = [];
  const seen = new Set<string>();
  const winterMonths = new Set([10, 11, 0, 1, 2]);

  weeks.forEach((week, index) => {
    const firstDay = week.find(Boolean);
    if (!firstDay) return;
    const date = new Date(firstDay.dayDate);
    if (!winterMonths.has(date.getUTCMonth())) return;
    const markerKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (seen.has(markerKey)) return;

    seen.add(markerKey);
    markers.push({
      index,
      label: date.toLocaleDateString("fr-FR", { month: "short" }),
    });
  });

  return markers;
}

function buildWeeks(days: ResortDaySnowStat[]): DayCell[][] {
  const byDate = new Map<string, DayCell>();
  days.forEach((day) => {
    const isoDate = day.dayDate.slice(0, 10);
    byDate.set(isoDate, { dayDate: day.dayDate, state: day.state });
  });

  const first = new Date(days[0].dayDate);
  const last = new Date(days[days.length - 1].dayDate);

  const start = new Date(first);
  const startDay = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - startDay);

  const end = new Date(last);
  const endDay = (end.getUTCDay() + 6) % 7;
  end.setUTCDate(end.getUTCDate() + (6 - endDay));

  const weeks: DayCell[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      const day = byDate.get(key);
      week.push(
        day ?? {
          dayDate: cursor.toISOString(),
          state: "unknown",
        }
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export default function ResortDailySnowHeatmap({
  days,
}: {
  days: ResortDaySnowStat[];
}) {
  if (days.length === 0) return null;

  const weeks = buildWeeks(days);
  const monthMarkers = getMonthMarkers(weeks);

  return (
    <div className="inline-block">
      <div className="inline-block">
        <div className="relative mb-3 h-4">
          {monthMarkers.map((marker) => (
            <span
              key={`${marker.index}-${marker.label}`}
              className="absolute top-0 text-[11px] text-gray-400"
              style={{ left: `${(marker.index / weeks.length) * 100}%` }}
            >
              {marker.label}
            </span>
          ))}
        </div>

        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={week[0]?.dayDate ?? `week-${weekIndex}`} className="grid grid-rows-7 gap-1">
              {week.map((day) => {
                const dateLabel = new Date(day.dayDate).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const stateLabel =
                  day.state === "open"
                    ? "au moins 1 piste ouverte"
                    : day.state === "closed"
                      ? "aucune piste ouverte"
                      : "donnée indisponible";

                return (
                  <div
                    key={day.dayDate}
                    className={`h-3 w-3 rounded-sm ${getDayStateClass(day.state)}`}
                    title={`${dateLabel} : ${stateLabel}`}
                    aria-label={`${dateLabel} : ${stateLabel}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-gray-400">
        <span>Fermé</span>
        <span className="h-3 w-3 rounded-sm bg-amber-200" />
        <span>Ouvert</span>
        <span className="h-3 w-3 rounded-sm bg-emerald-500" />
        <span>Inconnu</span>
        <span className="h-3 w-3 rounded-sm bg-gray-200" />
      </div>
    </div>
  );
}
