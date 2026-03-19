import HomePageClient from "@/components/HomePageClient";
import { Resort } from "@/types";
import { prisma } from "@/lib/prisma";

export const revalidate = 86400;

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

async function getLastUpdateDate(): Promise<string | null> {
  try {
    const now = new Date();
    const latest = await prisma.snowRecord.findFirst({
      where: { recordDate: { lte: now } },
      orderBy: { recordDate: "desc" },
      select: { recordDate: true },
    });
    if (!latest) return null;
    return latest.recordDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
                Retrouvez les bulletins d'enneigement de la majorité des domaines skiables nordiques français, mis à jour quotidiennement.
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
