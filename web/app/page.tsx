import HomePageClient from "@/components/HomePageClient";
import { Resort } from "@/types";
import { prisma } from "@/lib/prisma";

export const revalidate = 86400;

function getUtcDayBounds(now = new Date()): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

function formatLastUpdateTimestamp(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getResorts(): Promise<Resort[]> {
  try {
    const { start, end } = getUtcDayBounds();
    const resorts = await prisma.resort.findMany({
      orderBy: { name: "asc" },
      include: {
        snowRecords: {
          where: {
            recordDate: {
              gte: start,
              lt: end,
            },
          },
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

async function getLastUpdateDate(): Promise<string | null> {
  try {
    const { start, end } = getUtcDayBounds();
    const latest = await prisma.snowRecord.findFirst({
      where: {
        recordDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!latest) return null;

    return formatLastUpdateTimestamp(latest.createdAt);
  } catch {
    return null;
  }
}

export default async function Home() {
  const [resorts, lastUpdateDate] = await Promise.all([
    getResorts(),
    getLastUpdateDate(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">⛷️</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Le bulletin du jour</h1>
              <p className="text-sm text-gray-500">
                Retrouvez les bulletins d&apos;enneigement de la majorité des domaines skiables nordiques français, mis à jour quotidiennement.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <HomePageClient resorts={resorts} lastUpdateDate={lastUpdateDate} />
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
