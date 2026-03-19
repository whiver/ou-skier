"use client";

import { useMemo } from "react";
import ResortCard from "@/components/ResortCard";
import ResortsMap from "@/components/ResortsMap";
import { formatRegionLabel } from "@/lib/region";
import { sortFavoritesFirst, useFavoriteResorts } from "@/hooks/useFavoriteResorts";
import { usePagination } from "@/hooks/usePagination";
import type { Resort } from "@/types";
import { useState } from "react";

type HomePageClientProps = {
  resorts: Resort[];
  lastUpdateDate?: string | null;
};

export default function HomePageClient({ resorts, lastUpdateDate }: HomePageClientProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const { favoriteResortIds, favoriteResortIdsSet, toggleFavoriteResort } = useFavoriteResorts();

  const regions = useMemo(() => {
    return Array.from(
      new Set(
        resorts
          .map((resort) => resort.region)
          .filter((region): region is string => Boolean(region))
      )
    ).sort((left, right) => {
      const leftLabel = formatRegionLabel(left) ?? left;
      const rightLabel = formatRegionLabel(right) ?? right;

      return leftLabel.localeCompare(rightLabel, "fr");
    });
  }, [resorts]);

  const filteredResorts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return resorts.filter((resort) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        resort.name.toLowerCase().includes(normalizedSearch);
      const matchesRegion =
        selectedRegions.length === 0 ||
        (resort.region !== null && selectedRegions.includes(resort.region));

      return matchesSearch && matchesRegion;
    });
  }, [resorts, searchText, selectedRegions]);

  const orderedResorts = useMemo(() => {
    return sortFavoritesFirst(
      filteredResorts,
      (resort) => resort.id,
      favoriteResortIdsSet,
    );
  }, [filteredResorts, favoriteResortIdsSet]);

  const { visibleItems: paginatedResorts, hasMore, showMore } =
    usePagination(orderedResorts);

  const mappableResorts = useMemo(() => {
    return orderedResorts.filter(
      (resort) => resort.latitude !== null && resort.longitude !== null
    );
  }, [orderedResorts]);

  const toggleRegion = (region: string) => {
    setSelectedRegions((currentRegions) => {
      if (currentRegions.includes(region)) {
        return currentRegions.filter((currentRegion) => currentRegion !== region);
      }

      return [...currentRegions, region];
    });
  };

  if (resorts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <span className="text-5xl" aria-hidden="true">
          🌨️
        </span>
        <h2 className="mt-4 text-lg font-semibold text-gray-700">
          Aucun domaine disponible
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Les données seront disponibles après la première exécution du worker
          d&apos;ingestion.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm text-gray-500">
          {orderedResorts.length} domaine{orderedResorts.length > 1 ? "s" : ""}
          {` (${mappableResorts.length} avec coordonnées)`}
          {lastUpdateDate ? ` · mis à jour le ${lastUpdateDate}` : ""}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label
              htmlFor="resort-search"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Rechercher un domaine
            </label>
            <input
              id="resort-search"
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Nom de station"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <p className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Régions
            </p>
            <div className="flex flex-wrap gap-2">
              {regions.map((region) => {
                const isActive = selectedRegions.includes(region);

                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800"
                    }`}
                  >
                    {formatRegionLabel(region)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {orderedResorts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Aucun domaine ne correspond aux filtres actuels.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            {mappableResorts.length > 0 ? (
              <>
                <ResortsMap
                  key={favoriteResortIds.join(",") || "no-favorites"}
                  resorts={mappableResorts}
                  favoriteResortIds={favoriteResortIdsSet}
                />
                <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-gray-400">
                  <span>Fermé</span>
                  <span className="h-4 w-4 rounded-sm bg-red-500" />
                  <span>&lt; 50%</span>
                  <span className="h-4 w-4 rounded-sm bg-amber-300" />
                  <span>≥ 50%</span>
                  <span className="h-4 w-4 rounded-sm bg-emerald-500" />
                  <span className="ml-2">Inconnu</span>
                  <span className="h-4 w-4 rounded-sm bg-gray-200" />
                  <span className="ml-2 text-amber-600">Favori</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center text-base leading-none text-amber-500 drop-shadow-sm">
                    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                      <path
                        d="M10 1.75l2.28 4.63 5.12.74-3.7 3.61.87 5.09L10 13.41l-4.57 2.41.87-5.09-3.7-3.61 5.12-.74L10 1.75Z"
                        fill="currentColor"
                        stroke="#ffffff"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
                <p className="text-sm text-gray-500">
                  Aucun domaine filtré ne possède de coordonnées pour l&apos;affichage
                  sur la carte.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {paginatedResorts.map((resort) => (
                <ResortCard
                  key={resort.id}
                  resort={resort}
                  isFavorite={favoriteResortIdsSet.has(resort.id)}
                  onToggleFavorite={toggleFavoriteResort}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={showMore}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                >
                  Afficher plus de domaines
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
