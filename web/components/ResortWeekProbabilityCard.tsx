"use client";

import Link from "next/link";
import { formatRegionLabel } from "@/lib/region";
import FavoriteResortButton from "@/components/FavoriteResortButton";
import type { ResortWithWeekProbability } from "@/types";

export default function ResortWeekProbabilityCard({
  item,
  weekLabel,
  isFavorite,
  onToggleFavorite,
}: {
  item: ResortWithWeekProbability;
  weekLabel: string;
  isFavorite: boolean;
  onToggleFavorite: (resortId: number) => void;
}) {
  const { resort, weekProbability } = item;
  const regionLabel = formatRegionLabel(resort.region);

  return (
    <Link href={`/resorts/${resort.id}`}>
      <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:cursor-pointer hover:border-blue-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
              {resort.name}
            </h2>
            {regionLabel && <p className="mt-0.5 text-sm text-gray-500">{regionLabel}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FavoriteResortButton
              isFavorite={isFavorite}
              resortName={resort.name}
              onToggleFavorite={() => onToggleFavorite(resort.id)}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{weekLabel}</p>
          <p className="mt-1 text-sm font-medium text-gray-800">
            {weekProbability.unknown || weekProbability.probability === null ? (
              <span className="text-gray-500">Inconnu</span>
            ) : (
              <>
                <span className="text-lg font-bold text-gray-900">
                  {(weekProbability.probability * 100).toFixed(1)}%
                </span>{" "}
                de chance d&apos;avoir au moins 1 piste ouverte
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {weekProbability.unknown
              ? "Données insuffisantes"
              : `${weekProbability.sampleYears} année${weekProbability.sampleYears > 1 ? "s" : ""} avec données`}
          </p>
        </div>
      </div>
    </Link>
  );
}
