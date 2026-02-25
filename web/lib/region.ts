export function formatRegionLabel(region: string | null): string | null {
  if (!region) {
    return null;
  }

  return region
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}