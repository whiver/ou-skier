"use client";

import { useMemo, useState } from "react";
import ResortCard from "@/components/ResortCard";
import ResortsMap from "@/components/ResortsMap";
import { formatRegionLabel } from "@/lib/region";
import type { Resort } from "@/types";

type HomePageClientProps = {
  resorts: Resort[];
};

type ViewMode = "list" | "map";

export default function HomePageClient({ resorts }: HomePageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchText, setSearchText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

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

  const mappableResorts = useMemo(() => {
    return filteredResorts.filter(
      (resort) => resort.latitude !== null && resort.longitude !== null
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

          <p className="text-sm text-gray-500">
            {filteredResorts.length} domaine{filteredResorts.length > 1 ? "s" : ""}
            {viewMode === "map"
              ? ` (${mappableResorts.length} avec coordonnées)`
              : ""}
          </p>
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
      </section>

      {filteredResorts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Aucun domaine ne correspond aux filtres actuels.
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filteredResorts.map((resort) => (
            <ResortCard key={resort.id} resort={resort} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          {mappableResorts.length > 0 ? (
            <ResortsMap resorts={mappableResorts} />
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
