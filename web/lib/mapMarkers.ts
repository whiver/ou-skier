import type { DivIcon } from "leaflet";

type LeafletModule = typeof import("leaflet");

export function applyLeafletDefaultMarkerIcons(leaflet: LeafletModule): void {
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
}

export function createColorDotIconMap(
  leaflet: LeafletModule,
  colorClasses: readonly string[]
): Record<string, DivIcon> {
  const iconMap: Record<string, DivIcon> = {};

  colorClasses.forEach((colorClass) => {
    iconMap[colorClass] = leaflet.divIcon({
      className: "",
      html: `<span class=\"block h-4 w-4 rounded-full border border-white ${colorClass} shadow-sm\"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  });

  return iconMap;
}