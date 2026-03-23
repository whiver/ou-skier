import { notFound } from "next/navigation";
import ResortBackButton from "@/components/ResortBackButton";
import { prisma } from "@/lib/prisma";
import { formatRegionLabel } from "@/lib/region";
import {
  getResortAllYearsWeeklyAverageSnowStats,
  getResortCurrentYearDailySnowStats,
} from "@/lib/snowStats";
import ResortSnowHeatmap from "@/components/ResortSnowHeatmap";
import { Resort } from "@/types";

export const revalidate = 86400;

async function getResort(id: number): Promise<Resort | null> {
  try {
    const resort = await prisma.resort.findUnique({
      where: { id },
      include: {
        snowRecords: {
          orderBy: { recordDate: "desc" },
          take: 10,
        },
      },
    });
    return resort as unknown as Resort | null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value !== null && value !== undefined ? (
          <>
            {value}
            {unit && (
              <span className="ml-1 text-sm font-normal text-gray-500">
                {unit}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </p>
    </div>
  );
}

export default async function ResortPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resortId = parseInt(id, 10);
  if (isNaN(resortId)) notFound();

  const resort = await getResort(resortId);
  if (!resort) notFound();

  const [dailySnowStatsCurrentYear, weeklySnowStatsAllYears] = await Promise.all([
    getResortCurrentYearDailySnowStats(resortId),
    getResortAllYearsWeeklyAverageSnowStats(resortId),
  ]);
  const currentYear = new Date().getUTCFullYear();

  const latest = resort.snowRecords[0] ?? null;
  const history = resort.snowRecords.slice(1);
  const regionLabel = formatRegionLabel(resort.region);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <ResortBackButton />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{resort.name}</h1>
              {regionLabel && (
                <p className="mt-1 text-sm text-gray-500">
                  {regionLabel}
                </p>
              )}
            </div>
            {resort.domainUrl && (
              <a
                href={resort.domainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                Site officiel ↗
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {latest ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Conditions actuelles
              </h2>
              <span className="text-xs text-gray-400">
                {formatDate(latest.recordDate)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-8 sm:max-w-xs">
              <StatBox
                label="Pistes ouvertes"
                value={
                  latest.openSlopes !== null
                    ? `${latest.openSlopes}${latest.totalSlopes !== null ? `/${latest.totalSlopes}` : ""}`
                    : null
                }
              />
            </div>

            {latest.notes && (
              <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
                {latest.notes}
              </div>
            )}
          </>
        ) : (
          <div className="mb-8 rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-400 italic">
              Aucune donnée disponible pour ce domaine.
            </p>
          </div>
        )}

        <ResortSnowHeatmap
          currentYearDays={dailySnowStatsCurrentYear}
          allYearsWeeks={weeklySnowStatsAllYears}
          currentYear={currentYear}
        />

        {history.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Historique
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Pistes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(record.recordDate).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {record.openSlopes !== null
                          ? `${record.openSlopes}${record.totalSlopes !== null ? `/${record.totalSlopes}` : ""}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
