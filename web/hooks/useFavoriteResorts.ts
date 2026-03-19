"use client";

import { useEffect, useMemo, useState } from "react";

const FAVORITE_RESORT_IDS_STORAGE_KEY = "ou-skier.favorite-resort-ids";

function parseFavoriteResortIds(value: string | null): number[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed.filter(
          (entry): entry is number =>
            typeof entry === "number" && Number.isInteger(entry) && entry > 0,
        ),
      ),
    );
  } catch {
    return [];
  }
}

function readFavoriteResortIds(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  return parseFavoriteResortIds(
    window.localStorage.getItem(FAVORITE_RESORT_IDS_STORAGE_KEY),
  );
}

function writeFavoriteResortIds(ids: number[]): void {
  window.localStorage.setItem(
    FAVORITE_RESORT_IDS_STORAGE_KEY,
    JSON.stringify(ids),
  );
}

export function sortFavoritesFirst<T>(
  items: T[],
  getId: (item: T) => number,
  favoriteResortIds: ReadonlySet<number>,
): T[] {
  if (favoriteResortIds.size === 0) {
    return items;
  }

  const favorites: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    if (favoriteResortIds.has(getId(item))) {
      favorites.push(item);
      continue;
    }

    rest.push(item);
  }

  if (favorites.length === 0) {
    return items;
  }

  return [...favorites, ...rest];
}

export function useFavoriteResorts() {
  const [favoriteResortIds, setFavoriteResortIds] = useState<number[]>(() =>
    readFavoriteResortIds(),
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITE_RESORT_IDS_STORAGE_KEY) {
        return;
      }

      setFavoriteResortIds(readFavoriteResortIds());
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const favoriteResortIdsSet = useMemo(
    () => new Set(favoriteResortIds),
    [favoriteResortIds],
  );

  const toggleFavoriteResort = (resortId: number) => {
    setFavoriteResortIds((currentIds) => {
      const nextIds = currentIds.includes(resortId)
        ? currentIds.filter((currentId) => currentId !== resortId)
        : [...currentIds, resortId];

      writeFavoriteResortIds(nextIds);

      return nextIds;
    });
  };

  return {
    favoriteResortIds,
    favoriteResortIdsSet,
    toggleFavoriteResort,
  };
}