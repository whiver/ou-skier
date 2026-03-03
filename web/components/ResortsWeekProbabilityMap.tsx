"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatRegionLabel } from "@/lib/region";
import type { ResortWithWeekProbability } from "@/types";

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

type ResortsWeekProbabilityMapProps = {
  resorts: ResortWithWeekProbability[];
  weekLabel: string;
};

const defaultCenter: [number, number] = [46.6, 2.2];
const defaultZoom = 6;

function getProbabilityClass(probability: number | null, unknown: boolean): string {
  if (unknown || probability === null) return "bg-gray-200";
  if (probability <= 0) return "bg-emerald-100";
  if (probability <= 1.5 / 7) return "bg-emerald-200";
  if (probability <= 3.5 / 7) return "bg-emerald-300";
  if (probability <= 5.5 / 7) return "bg-emerald-400";
  return "bg-emerald-500";
}

export default function ResortsWeekProbabilityMap({
  resorts,
  weekLabel,
}: ResortsWeekProbabilityMapProps) {
  const [iconMap, setIconMap] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const createIcons = async () => {
      const leaflet = await import("leaflet");

      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL(
          "leaflet/dist/images/marker-icon-2x.png",
          import.meta.url
        ).toString(),
        iconUrl: new URL(
          "leaflet/dist/images/marker-icon.png",
          import.meta.url
        ).toString(),
        shadowUrl: new URL(
          "leaflet/dist/images/marker-shadow.png",
          import.meta.url
        ).toString(),
      });

      const colors = [
        "bg-emerald-100",
        "bg-emerald-200",
        "bg-emerald-300",
        "bg-emerald-400",
        "bg-emerald-500",
        "bg-gray-200",
      ];

      const nextMap: Record<string, unknown> = {};
      colors.forEach((colorClass) => {
        nextMap[colorClass] = leaflet.divIcon({
          className: "",
          html: `<span class=\"block h-4 w-4 rounded-full border border-white ${colorClass} shadow-sm\"></span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          popupAnchor: [0, -8],
        });
      });

      setIconMap(nextMap);
    };

    createIcons();
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles &copy; <a href="https://www.openstreetmap.fr">OpenStreetMap France</a>'
          url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
        />
        <TileLayer
          attribution='Ski data &copy; <a href="https://www.opensnowmap.org">OpenSnowMap</a> CC-BY-SA'
          url="https://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png"
          opacity={0.8}
        />
        {resorts.map((item) => {
          const { resort, weekProbability } = item;
          if (resort.latitude === null || resort.longitude === null) {
            return null;
          }

          const regionLabel = formatRegionLabel(resort.region);
          const probabilityLabel = weekProbability.unknown || weekProbability.probability === null
            ? "Inconnu"
            : `${(weekProbability.probability * 100).toFixed(1)}%`;
          const colorClass = getProbabilityClass(
            weekProbability.probability,
            weekProbability.unknown
          );
          const icon = iconMap?.[colorClass] as never | undefined;

          return (
            <Marker
              key={resort.id}
              position={[resort.latitude, resort.longitude]}
              {...(icon ? { icon } : {})}
            >
              <Popup>
                <div className="min-w-44">
                  <p className="font-semibold text-gray-900">{resort.name}</p>
                  {regionLabel && (
                    <p className="text-sm text-gray-500">{regionLabel}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-700">
                    {weekLabel} : <span className="font-semibold">{probabilityLabel}</span>
                  </p>
                  {weekProbability.unknown ? (
                    <p className="text-xs text-gray-500">
                      Données insuffisantes
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Probabilité d&apos;au moins 1 piste ouverte ({weekProbability.sampleYears} année{weekProbability.sampleYears > 1 ? "s" : ""})
                    </p>
                  )}
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
