"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Resort } from "@/types";
import { formatRegionLabel } from "@/lib/region";

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
};

const defaultCenter: [number, number] = [46.6, 2.2];
const defaultZoom = 6;

export default function ResortsMap({ resorts }: ResortsMapProps) {
  useEffect(() => {
    const applyMarkerIcons = async () => {
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {resorts.map((resort) => {
          if (resort.latitude === null || resort.longitude === null) {
            return null;
          }

          const regionLabel = formatRegionLabel(resort.region);

          return (
            <Marker
              key={resort.id}
              position={[resort.latitude, resort.longitude]}
            >
              <Popup>
                <div className="min-w-44">
                  <p className="font-semibold text-gray-900">{resort.name}</p>
                  {regionLabel && (
                    <p className="text-sm text-gray-500">{regionLabel}</p>
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
