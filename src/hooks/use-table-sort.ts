"use client";

import { useState, useMemo, useCallback } from "react";

export type SortDir = "asc" | "desc";

/**
 * Generic table sorting hook.
 *
 * @param defaultKey  - initial column to sort by
 * @param defaultDir  - initial direction ("asc" | "desc")
 *
 * Usage:
 *   const { sortKey, sortDir, toggleSort, sort } = useTableSort<MySortKey>("position", "asc");
 *   const sorted = sort(rows, (row, key) => row[key]);
 */
export function useTableSort<K extends string>(
  defaultKey: K,
  defaultDir: SortDir = "asc"
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggleSort = useCallback(
    (key: K) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  /**
   * Sort an array by the current sort key/dir.
   * `accessor` extracts the comparable value from each item for a given key.
   */
  const sort = useCallback(
    <T>(data: T[], accessor: (item: T, key: K) => unknown): T[] => {
      const mult = sortDir === "asc" ? 1 : -1;
      return [...data].sort((a, b) => {
        const aVal = accessor(a, sortKey);
        const bVal = accessor(b, sortKey);

        // Nulls / undefined always last
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Numbers
        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * mult;
        }

        // Dates (ISO strings)
        if (
          typeof aVal === "string" &&
          typeof bVal === "string" &&
          /^\d{4}-\d{2}/.test(aVal) &&
          /^\d{4}-\d{2}/.test(bVal)
        ) {
          return aVal.localeCompare(bVal) * mult;
        }

        // Strings
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return aStr.localeCompare(bStr) * mult;
      });
    },
    [sortKey, sortDir]
  );

  return { sortKey, sortDir, toggleSort, sort };
}
