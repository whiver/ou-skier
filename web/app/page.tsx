import WeeklyHomePageClient from "@/components/WeeklyHomePageClient";
import { getResortsWeekProbabilities } from "@/lib/snowStats";
import { prisma } from "@/lib/prisma";
import type { Resort } from "@/types";

async function getResorts(): Promise<Resort[]> {
  try {
    const resorts = await prisma.resort.findMany({
      orderBy: { name: "asc" },
      include: {
        snowRecords: {
          orderBy: { recordDate: "desc" },
          take: 1,
        },
      },
    });

    return resorts as unknown as Resort[];
  } catch {
    return [];
  }
}

function isValidDateParam(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDateFromParam(dateParam: string | undefined): Date {
  if (!dateParam || !isValidDateParam(dateParam)) {
    return new Date();
  }

  const parsed = new Date(`${dateParam}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function getIsoWeek(date: Date): number {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));

  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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

function getWeekLabel(date: Date, isoWeek: number): string {
  const weekStart = getIsoWeekStart(date.getUTCFullYear(), isoWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const startLabel = weekStart.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const endLabel = weekEnd.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return `Semaine ${isoWeek} (${startLabel} → ${endLabel})`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedDateObject = getDateFromParam(resolvedSearchParams.date);
  const selectedDate = selectedDateObject.toISOString().slice(0, 10);
  const isoWeek = getIsoWeek(selectedDateObject);

  const [resorts, probabilities] = await Promise.all([
    getResorts(),
    getResortsWeekProbabilities(isoWeek),
  ]);

  const weekLabel = getWeekLabel(selectedDateObject, isoWeek);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              ⛷️
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Où skier à la meilleure période ?
              </h1>
              <p className="text-sm text-gray-500">
                Comparez les domaines par probabilité d&apos;avoir au moins 1 piste
                ouverte
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <WeeklyHomePageClient
          resorts={resorts}
          probabilities={probabilities}
          selectedDate={selectedDate}
          weekLabel={weekLabel}
        />
      </main>

      <footer className="mt-16 border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        Données issues de{" "}
        <a
          href="https://www.nordicfrance.fr"
          className="underline hover:text-gray-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          Nordic France
        </a>
      </footer>
    </div>
  );
}
