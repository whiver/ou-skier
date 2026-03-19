"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatRegionLabel } from "@/lib/region";
import { usePagination } from "@/hooks/usePagination";
import ResortsWeekProbabilityMap from "@/components/ResortsWeekProbabilityMap";
import ResortWeekProbabilityCard from "@/components/ResortWeekProbabilityCard";
import type { Resort, ResortWeekProbability, ResortWithWeekProbability } from "@/types";

type ViewMode = "list" | "map";

type WeeklyHomePageClientProps = {
  resorts: Resort[];
  probabilities: ResortWeekProbability[];
  selectedDate: string;
  weekLabel: string;
};

function emptyProbability(resortId: number): ResortWeekProbability {
  return {
    resortId,
    isoWeek: 1,
    probability: null,
    averageOpenDays: null,
    sampleYears: 0,
    unknown: true,
  };
}

export default function WeeklyHomePageClient({
  resorts,
  probabilities,
  selectedDate,
  weekLabel,
}: WeeklyHomePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchText, setSearchText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const probabilityByResortId = useMemo(() => {
    return new Map(probabilities.map((entry) => [entry.resortId, entry]));
  }, [probabilities]);

  const resortsWithProbability = useMemo<ResortWithWeekProbability[]>(() => {
    return resorts
      .map((resort) => ({
        resort,
        weekProbability:
          probabilityByResortId.get(resort.id) ?? emptyProbability(resort.id),
      }))
      .sort((left, right) => {
        if (left.weekProbability.unknown && !right.weekProbability.unknown) {
          return 1;
        }
        if (!left.weekProbability.unknown && right.weekProbability.unknown) {
          return -1;
        }

        const leftProbability = left.weekProbability.probability ?? -1;
        const rightProbability = right.weekProbability.probability ?? -1;
        if (leftProbability !== rightProbability) {
          return rightProbability - leftProbability;
        }

        return left.resort.name.localeCompare(right.resort.name, "fr");
      });
  }, [resorts, probabilityByResortId]);

  const regions = useMemo(() => {
    return Array.from(
      new Set(
        resortsWithProbability
          .map((item) => item.resort.region)
          .filter((region): region is string => Boolean(region))
      )
    ).sort((left, right) => {
      const leftLabel = formatRegionLabel(left) ?? left;
      const rightLabel = formatRegionLabel(right) ?? right;

      return leftLabel.localeCompare(rightLabel, "fr");
    });
  }, [resortsWithProbability]);

  const filteredResorts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return resortsWithProbability.filter(({ resort }) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        resort.name.toLowerCase().includes(normalizedSearch);
      const matchesRegion =
        selectedRegions.length === 0 ||
        (resort.region !== null && selectedRegions.includes(resort.region));

      return matchesSearch && matchesRegion;
    });
  }, [resortsWithProbability, searchText, selectedRegions]);

  const { visibleItems: paginatedResorts, hasMore, showMore } =
    usePagination(filteredResorts);

  const mappableResorts = useMemo(() => {
    return filteredResorts.filter(
      ({ resort }) => resort.latitude !== null && resort.longitude !== null
    );
  }, [filteredResorts]);

  const toggleRegion = (region: string) => {
    setSelectedRegions((currentRegions) => {
      if (currentRegions.includes(region)) {
        return currentRegions.filter((currentRegion) => currentRegion !== region);
      }

      return [...currentRegions, region];
    });
  };

  const handleDateChange = (nextDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    router.push(`${pathname}?${params.toString()}`);
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
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label
              htmlFor="vacation-date"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Date de départ (semaine visée)
            </label>
            <input
              id="vacation-date"
              type="date"
              value={selectedDate}
              onChange={(event) => handleDateChange(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-2 text-xs text-gray-500">{weekLabel}</p>
          </div>

          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "map"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Carte
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Liste
            </button>
          </div>
        </div>

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

        <p className="mt-4 text-sm text-gray-500">
          {filteredResorts.length} domaine{filteredResorts.length > 1 ? "s" : ""}
          {viewMode === "map"
            ? ` (${mappableResorts.length} avec coordonnées)`
            : ""}
        </p>
      </section>

      {filteredResorts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Aucun domaine ne correspond aux filtres actuels.
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {paginatedResorts.map((item) => (
              <ResortWeekProbabilityCard
                key={item.resort.id}
                item={item}
                weekLabel={weekLabel}
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
      ) : (
        <div className="mt-6">
          {mappableResorts.length > 0 ? (
            <>
              <ResortsWeekProbabilityMap resorts={mappableResorts} weekLabel={weekLabel} />
              <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-gray-400">
                <span>Moins</span>
                <span className="h-4 w-4 rounded-sm bg-emerald-100" />
                <span className="h-4 w-4 rounded-sm bg-emerald-200" />
                <span className="h-4 w-4 rounded-sm bg-emerald-300" />
                <span className="h-4 w-4 rounded-sm bg-emerald-400" />
                <span className="h-4 w-4 rounded-sm bg-emerald-500" />
                <span>Plus</span>
                <span className="ml-2">Inconnu</span>
                <span className="h-4 w-4 rounded-sm bg-gray-200" />
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
      )}
    </>
  );
}
