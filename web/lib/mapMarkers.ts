import type { DivIcon } from "leaflet";

type LeafletModule = typeof import("leaflet");
type MarkerShape = "circle" | "star";

function getMarkerColor(colorClass: string): string {
  switch (colorClass) {
    case "bg-emerald-500":
      return "#10b981";
    case "bg-emerald-400":
      return "#34d399";
    case "bg-emerald-300":
      return "#6ee7b7";
    case "bg-emerald-200":
      return "#a7f3d0";
    case "bg-emerald-100":
      return "#d1fae5";
    case "bg-amber-300":
      return "#fcd34d";
    case "bg-red-500":
      return "#ef4444";
    case "bg-gray-200":
      return "#e5e7eb";
    default:
      return "#9ca3af";
  }
}

function createFavoriteStarHtml(colorClass: string): string {
  const markerColor = getMarkerColor(colorClass);

  return `
    <span style="display:block;width:28px;height:28px;filter:drop-shadow(0 2px 4px rgba(15, 23, 42, 0.28));">
      <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
        <path
          d="M14 2.5l3.19 6.46 7.13 1.04-5.16 5.03 1.22 7.1L14 18.77l-6.38 3.36 1.22-7.1-5.16-5.03 7.13-1.04L14 2.5Z"
          fill="#f59e0b"
          stroke="#ffffff"
          stroke-width="2.2"
          stroke-linejoin="round"
        />
        <circle cx="14" cy="14" r="4.1" fill="${markerColor}" stroke="#ffffff" stroke-width="1.6" />
      </svg>
    </span>
  `;
}

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
  return createColorShapeIconMap(leaflet, colorClasses, "circle");
}

export function createColorShapeIconMap(
  leaflet: LeafletModule,
  colorClasses: readonly string[],
  shape: MarkerShape,
): Record<string, DivIcon> {
  const iconMap: Record<string, DivIcon> = {};
  const isStar = shape === "star";

  colorClasses.forEach((colorClass) => {
    iconMap[colorClass] = leaflet.divIcon({
      className: "",
      html: isStar
        ? createFavoriteStarHtml(colorClass)
        : `<span class="block h-4 w-4 rounded-full border border-white ${colorClass} shadow-sm"></span>`,
      iconSize: isStar ? [28, 28] : [16, 16],
      iconAnchor: isStar ? [14, 14] : [8, 8],
      popupAnchor: isStar ? [0, -14] : [0, -8],
    });
  });

  return iconMap;
}