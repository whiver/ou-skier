import type { Resort } from "@/types";

export type ResortSortOption =
  | "name-asc"
  | "name-desc"
  | "open-slopes-desc"
  | "open-slopes-asc";

export const RESORT_SORT_OPTIONS: Array<{
  value: ResortSortOption;
  label: string;
}> = [
  { value: "name-asc", label: "Ordre alphabétique" },
  { value: "name-desc", label: "Ordre alphabétique inversé" },
  { value: "open-slopes-desc", label: "Pistes ouvertes décroissant" },
  { value: "open-slopes-asc", label: "Pistes ouvertes croissant" },
];

function compareNames(leftName: string, rightName: string): number {
  return leftName.localeCompare(rightName, "fr");
}

function compareNullableNumbers(
  leftValue: number | null,
  rightValue: number | null,
  direction: "asc" | "desc",
): number {
  if (leftValue === null && rightValue === null) {
    return 0;
  }

  if (leftValue === null) {
    return 1;
  }

  if (rightValue === null) {
    return -1;
  }

  return direction === "asc"
    ? leftValue - rightValue
    : rightValue - leftValue;
}

export function getLatestOpenSlopes(resort: Resort): number | null {
  return resort.snowRecords[0]?.openSlopes ?? null;
}

export function sortResortsByOption<T>(
  items: T[],
  sortOption: ResortSortOption,
  getResort: (item: T) => Resort,
): T[] {
  return [...items].sort((leftItem, rightItem) => {
    const leftResort = getResort(leftItem);
    const rightResort = getResort(rightItem);

    if (sortOption === "name-asc") {
      return compareNames(leftResort.name, rightResort.name);
    }

    if (sortOption === "name-desc") {
      return compareNames(rightResort.name, leftResort.name);
    }

    const direction = sortOption === "open-slopes-asc" ? "asc" : "desc";
    const slopeComparison = compareNullableNumbers(
      getLatestOpenSlopes(leftResort),
      getLatestOpenSlopes(rightResort),
      direction,
    );

    if (slopeComparison !== 0) {
      return slopeComparison;
    }

    return compareNames(leftResort.name, rightResort.name);
  });
}
