import ResortCard from "@/components/ResortCard";
import { Resort } from "@/types";
import { prisma } from "@/lib/prisma";

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

export default async function Home() {
  const resorts = await getResorts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">⛷️</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Où Skier ?</h1>
              <p className="text-sm text-gray-500">
                Conditions d&apos;enneigement des domaines nordiques français
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {resorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <span className="text-5xl" aria-hidden="true">🌨️</span>
            <h2 className="mt-4 text-lg font-semibold text-gray-700">
              Aucun domaine disponible
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Les données seront disponibles après la première exécution du
              worker d&apos;ingestion.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              {resorts.length} domaine{resorts.length > 1 ? "s" : ""} répertorié
              {resorts.length > 1 ? "s" : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {resorts.map((resort) => (
                <ResortCard key={resort.id} resort={resort} />
              ))}
            </div>
          </>
        )}
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

