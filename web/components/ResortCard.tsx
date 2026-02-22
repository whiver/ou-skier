import Link from "next/link";
import { Resort } from "@/types";

function SnowDepthBadge({ depth }: { depth: number | null }) {
  if (depth === null) return <span className="text-gray-400 text-sm">—</span>;
  const color =
    depth >= 50
      ? "bg-blue-100 text-blue-800"
      : depth >= 20
        ? "bg-sky-100 text-sky-700"
        : "bg-yellow-100 text-yellow-700";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${color}`}>
      {depth} cm
    </span>
  );
}

export default function ResortCard({ resort }: { resort: Resort }) {
  const latest = resort.snowRecords[0] ?? null;
  const recordDate = latest
    ? new Date(latest.recordDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Link href={`/resorts/${resort.id}`}>
      <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-200 cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {resort.name}
            </h2>
            {(resort.region || resort.department) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[resort.department, resort.region].filter(Boolean).join(" — ")}
              </p>
            )}
          </div>
          {resort.domainUrl && (
            <a
              href={resort.domainUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-xs text-blue-500 underline hover:text-blue-700"
            >
              Site officiel
            </a>
          )}
        </div>

        {latest ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Enneigement bas
              </p>
              <SnowDepthBadge depth={latest.snowDepthBase} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Enneigement haut
              </p>
              <SnowDepthBadge depth={latest.snowDepthTop} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Pistes ouvertes
              </p>
              <span className="text-sm font-medium text-gray-800">
                {latest.openSlopes !== null ? (
                  <>
                    {latest.openSlopes}
                    {latest.totalSlopes !== null && (
                      <span className="text-gray-400">/{latest.totalSlopes}</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Neige fraîche
              </p>
              <SnowDepthBadge depth={latest.freshSnow} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-400 italic">
            Aucune donnée disponible
          </p>
        )}

        {recordDate && (
          <p className="mt-3 text-xs text-gray-400">Mis à jour le {recordDate}</p>
        )}
      </div>
    </Link>
  );
}
