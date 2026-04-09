"use client";

import { useMemo } from "react";
import ResortCard from "@/components/ResortCard";
import ResortsMap from "@/components/ResortsMap";
import { formatRegionLabel } from "@/lib/region";
import {
  RESORT_SORT_OPTIONS,
  sortResortsByOption,
  type ResortSortOption,
} from "@/lib/resortSorting";
import {
  getSlopeOpeningLevel,
  type SlopeOpeningLevel,
} from "@/lib/slopeOpeningLevel";
import { sortFavoritesFirst, useFavoriteResorts } from "@/hooks/useFavoriteResorts";
import { usePagination } from "@/hooks/usePagination";
import type { Resort } from "@/types";
import { useState } from "react";

type HomePageClientProps = {
  resorts: Resort[];
  lastUpdateDate?: string | null;
};

const SLOPE_OPENING_LEVEL_OPTIONS: Array<{
  value: Exclude<SlopeOpeningLevel, "unknown">;
  label: string;
  activeClassName: string;
}> = [
  {
    value: "green",
    label: "≥ 50%",
    activeClassName: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "yellow",
    label: "< 50%",
    activeClassName: "border-amber-400 bg-amber-50 text-amber-700",
  },
  {
    value: "red",
    label: "Fermé",
    activeClassName: "border-red-500 bg-red-50 text-red-700",
  },
];

export default function HomePageClient({ resorts, lastUpdateDate }: HomePageClientProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedSlopeOpeningLevel, setSelectedSlopeOpeningLevel] = useState<
    Exclude<SlopeOpeningLevel, "unknown"> | null
  >(null);
  const [sortOption, setSortOption] = useState<ResortSortOption>("name-asc");
  const { favoriteResortIds, favoriteResortIdsSet, toggleFavoriteResort } = useFavoriteResorts();
  const hasTodayData = resorts.some((resort) => resort.snowRecords.length > 0);

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
      const matchesSlopeOpeningLevel =
        selectedSlopeOpeningLevel === null ||
        getSlopeOpeningLevel(resort) === selectedSlopeOpeningLevel;

      return matchesSearch && matchesRegion && matchesSlopeOpeningLevel;
    });
  }, [resorts, searchText, selectedRegions, selectedSlopeOpeningLevel]);

  const sortedResorts = useMemo(() => {
    return sortResortsByOption(filteredResorts, sortOption, (resort) => resort);
  }, [filteredResorts, sortOption]);

  const orderedResorts = useMemo(() => {
    return sortFavoritesFirst(
      sortedResorts,
      (resort) => resort.id,
      favoriteResortIdsSet,
    );
  }, [sortedResorts, favoriteResortIdsSet]);

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

  if (!hasTodayData) {
    return (
      <div className="rounded-[2rem] border border-dashed border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-12 text-center shadow-sm">
        <span className="text-5xl" aria-hidden="true">
          ☁️
        </span>
        <h2 className="mt-4 text-xl font-semibold text-slate-800">
          La saison d&apos;hiver n&apos;est pas encore là
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Aucun bulletin n&apos;est disponible pour aujourd&apos;hui. Il n&apos;y a rien à afficher pour le moment, mais les domaines réapparaîtront ici dès qu&apos;un nouveau bulletin sera disponible.
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

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
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
            <label
              htmlFor="resort-sort"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Trier par
            </label>
            <select
              id="resort-sort"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as ResortSortOption)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {RESORT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
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

        <div className="mt-4">
          <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Niveau d&apos;ouverture des pistes
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedSlopeOpeningLevel(null)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
                selectedSlopeOpeningLevel === null
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800"
              }`}
            >
              Tous
            </button>
            {SLOPE_OPENING_LEVEL_OPTIONS.map((option) => {
              const isActive = selectedSlopeOpeningLevel === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedSlopeOpeningLevel(option.value)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isActive
                      ? option.activeClassName
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
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
