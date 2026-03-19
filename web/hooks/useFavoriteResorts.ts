"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const FAVORITE_RESORT_IDS_STORAGE_KEY = "ou-skier.favorite-resort-ids";

type FavoriteResortStorageSnapshot = {
  ids: number[];
  isAvailable: boolean;
};

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

function readFavoriteResortIds(): FavoriteResortStorageSnapshot {
  if (typeof window === "undefined") {
    return { ids: [], isAvailable: false };
  }

  try {
    return {
      ids: parseFavoriteResortIds(
        window.localStorage.getItem(FAVORITE_RESORT_IDS_STORAGE_KEY),
      ),
      isAvailable: true,
    };
  } catch {
    return { ids: [], isAvailable: false };
  }
}

function writeFavoriteResortIds(ids: number[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      FAVORITE_RESORT_IDS_STORAGE_KEY,
      JSON.stringify(ids),
    );

    return true;
  } catch {
    return false;
  }
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
    readFavoriteResortIds().ids,
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITE_RESORT_IDS_STORAGE_KEY) {
        return;
      }

      setFavoriteResortIds(readFavoriteResortIds().ids);
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

  const toggleFavoriteResort = useCallback((resortId: number) => {
    setFavoriteResortIds((currentIds) => {
      const storageSnapshot = readFavoriteResortIds();
      const sourceIds = storageSnapshot.isAvailable
        ? storageSnapshot.ids
        : currentIds;
      const nextIds = sourceIds.includes(resortId)
        ? sourceIds.filter((currentId) => currentId !== resortId)
        : [...sourceIds, resortId];

      writeFavoriteResortIds(nextIds);

      return nextIds;
    });
  }, []);

  return {
    favoriteResortIds,
    favoriteResortIdsSet,
    toggleFavoriteResort,
  };
}