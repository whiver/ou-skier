"use client";

import Link from "next/link";
import { Resort } from "@/types";
import { formatRegionLabel } from "@/lib/region";
import FavoriteResortButton from "@/components/FavoriteResortButton";

export default function ResortCard({
  resort,
  isFavorite,
  onToggleFavorite,
}: {
  resort: Resort;
  isFavorite: boolean;
  onToggleFavorite: (resortId: number) => void;
}) {
  const latest = resort.snowRecords[0] ?? null;
  const regionLabel = formatRegionLabel(resort.region);
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
            {regionLabel && (
              <p className="text-sm text-gray-500 mt-0.5">
                {regionLabel}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FavoriteResortButton
              isFavorite={isFavorite}
              resortName={resort.name}
              onToggleFavorite={() => onToggleFavorite(resort.id)}
            />
          </div>
        </div>

        {latest ? (
          <div className="mt-4">
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
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Pistes ouvertes
            </p>
            <p className="mt-1 text-sm font-medium text-gray-500">Inconnu</p>
          </div>
        )}

        {recordDate && (
          <p className="mt-3 text-xs text-gray-400">Mis à jour le {recordDate}</p>
        )}
      </div>
    </Link>
  );
}
