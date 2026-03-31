"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Resort } from "@/types";
import { formatRegionLabel } from "@/lib/region";
import {
  applyLeafletDefaultMarkerIcons,
  createColorDotIconMap,
  createColorShapeIconMap,
} from "@/lib/mapMarkers";
import { getSlopeOpeningLevel } from "@/lib/slopeOpeningLevel";
import type { DivIcon } from "leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((module) => module.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((module) => module.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((module) => module.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((module) => module.Popup),
  { ssr: false }
);

type ResortsMapProps = {
  resorts: Resort[];
  favoriteResortIds: ReadonlySet<number>;
};

const defaultCenter: [number, number] = [46.6, 2.2];
const defaultZoom = 6;

const OPEN_COLOR_CLASS = "bg-emerald-500";
const PARTIAL_COLOR_CLASS = "bg-amber-300";
const CLOSED_COLOR_CLASS = "bg-red-500";
const UNKNOWN_COLOR_CLASS = "bg-gray-200";

function getDailyOpenStateColorClass(resort: Resort): string {
  const state = getSlopeOpeningLevel(resort);
  if (state === "green") return OPEN_COLOR_CLASS;
  if (state === "yellow") return PARTIAL_COLOR_CLASS;
  if (state === "red") return CLOSED_COLOR_CLASS;
  return UNKNOWN_COLOR_CLASS;
}

export default function ResortsMap({
  resorts,
  favoriteResortIds,
}: ResortsMapProps) {
  const [iconMap, setIconMap] = useState<Record<string, DivIcon> | null>(null);
  const [favoriteIconMap, setFavoriteIconMap] = useState<Record<string, DivIcon> | null>(null);

  useEffect(() => {
    const applyMarkerIcons = async () => {
      const leaflet = await import("leaflet");
      applyLeafletDefaultMarkerIcons(leaflet);

      setIconMap(
        createColorDotIconMap(leaflet, [
          OPEN_COLOR_CLASS,
          PARTIAL_COLOR_CLASS,
          CLOSED_COLOR_CLASS,
          UNKNOWN_COLOR_CLASS,
        ])
      );
      setFavoriteIconMap(
        createColorShapeIconMap(
          leaflet,
          [
            OPEN_COLOR_CLASS,
            PARTIAL_COLOR_CLASS,
            CLOSED_COLOR_CLASS,
            UNKNOWN_COLOR_CLASS,
          ],
          "star",
        )
      );
    };

    applyMarkerIcons();
  }, []);

  return (
    <div className="h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={`https://api.maptiler.com/maps/winter-v4/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`}
          tileSize={512}
          zoomOffset={-1}
          minZoom={1}
          crossOrigin={true}
        />
        <TileLayer
          attribution='Ski data &copy; <a href="https://www.opensnowmap.org">OpenSnowMap</a> CC-BY-SA'
          url="https://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png"
          opacity={0.8}
        />
        {resorts.map((resort) => {
          if (resort.latitude === null || resort.longitude === null) {
            return null;
          }

          const regionLabel = formatRegionLabel(resort.region);
          const colorClass = getDailyOpenStateColorClass(resort);
          const isFavorite = favoriteResortIds.has(resort.id);
          const icon = isFavorite
            ? favoriteIconMap?.[colorClass]
            : iconMap?.[colorClass];
          const latest = resort.snowRecords[0];
          const openSlopesLabel =
            latest && latest.openSlopes !== null
              ? `${latest.openSlopes}${
                  latest.totalSlopes !== null ? `/${latest.totalSlopes}` : ""
                }`
              : "Inconnu";

          return (
            <Marker
              key={resort.id}
              position={[resort.latitude, resort.longitude]}
              zIndexOffset={isFavorite ? 1000 : 0}
              {...(icon ? { icon } : {})}
            >
              <Popup>
                <div className="min-w-44">
                  <p className="font-semibold text-gray-900">{resort.name}</p>
                  {regionLabel && (
                    <p className="text-sm text-gray-500">{regionLabel}</p>
                  )}
                  {isFavorite && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Favori
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-700">
                    Pistes ouvertes : <span className="font-semibold">{openSlopesLabel}</span>
                  </p>
                  <Link
                    href={`/resorts/${resort.id}`}
                    className="mt-2 inline-block text-sm text-blue-600 underline hover:text-blue-700"
                  >
                    Voir les détails
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
