"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultRadarConfig,
  type RadarFilterConfig,
  type SavedRadarFilter,
} from "./radar-types";

interface RadarApiPayload {
  filters: SavedRadarFilter[];
  savedBidIds: string[];
  hiddenBidIds: string[];
}

function getLocalCacheKey(cnpj?: string | null) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return `compras-abertas:me-radar-cache:${clean || "default"}`;
}

function getLegacyFavsKey(cnpj?: string | null) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return `compras-abertas:me-favs:${clean || "default"}`;
}

function normalizeFilterFromApi(raw: SavedRadarFilter): SavedRadarFilter {
  return {
    ...raw,
    config: createDefaultRadarConfig(raw.config),
  };
}

export function useRadarState(cnpj?: string | null) {
  const [filters, setFilters] = useState<SavedRadarFilter[]>([]);
  const [savedBidIds, setSavedBidIds] = useState<Set<string>>(() => new Set());
  const [hiddenBidIds, setHiddenBidIds] = useState<Set<string>>(() => new Set());
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [savingFilter, setSavingFilter] = useState(false);
  const syncedLegacyRef = useRef(false);

  const persistLocalSnapshot = useCallback(
    (
      nextFilters: SavedRadarFilter[],
      nextSaved: Set<string>,
      nextHidden: Set<string>,
    ) => {
      if (typeof window === "undefined") return;
      try {
        const snapshot: RadarApiPayload = {
          filters: nextFilters,
          savedBidIds: Array.from(nextSaved),
          hiddenBidIds: Array.from(nextHidden),
        };
        window.localStorage.setItem(
          getLocalCacheKey(cnpj),
          JSON.stringify(snapshot),
        );
        window.localStorage.setItem(
          getLegacyFavsKey(cnpj),
          JSON.stringify(Array.from(nextSaved)),
        );
      } catch {
        // ignora quota de localStorage
      }
    },
    [cnpj],
  );

  // Hidrata cache local imediato e sincroniza com o banco PostgreSQL
  useEffect(() => {
    let cancelled = false;

    let legacyFavs: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const rawLegacy = window.localStorage.getItem(getLegacyFavsKey(cnpj));
        if (rawLegacy) {
          const parsed = JSON.parse(rawLegacy);
          if (Array.isArray(parsed)) legacyFavs = parsed.filter(Boolean);
        }
      } catch {
        // ignora
      }

      try {
        const cachedRaw = window.localStorage.getItem(getLocalCacheKey(cnpj));
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as Partial<RadarApiPayload>;
          const initialSaved = new Set<string>([
            ...(Array.isArray(parsed.savedBidIds) ? parsed.savedBidIds : []),
            ...legacyFavs,
          ]);
          const initialHidden = new Set<string>(
            Array.isArray(parsed.hiddenBidIds) ? parsed.hiddenBidIds : [],
          );
          const initialFilters = Array.isArray(parsed.filters)
            ? parsed.filters.map(normalizeFilterFromApi)
            : [];

          setFilters(initialFilters);
          setSavedBidIds(initialSaved);
          setHiddenBidIds(initialHidden);
        } else if (legacyFavs.length > 0) {
          setSavedBidIds(new Set(legacyFavs));
        }
      } catch {
        // ignora
      }
    }

    fetch("/api/me/radar")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as RadarApiPayload;
      })
      .then(async (remote) => {
        if (cancelled || !remote) {
          if (!cancelled) setLoadingRadar(false);
          return;
        }

        const remoteSaved = new Set<string>(remote.savedBidIds ?? []);
        const remoteHidden = new Set<string>(remote.hiddenBidIds ?? []);
        const remoteFilters = (remote.filters ?? []).map(normalizeFilterFromApi);

        // Migra favoritos antigos do navegador para o banco na primeira carga
        const unsyncedFavs = legacyFavs.filter((id) => !remoteSaved.has(id));
        if (unsyncedFavs.length > 0 && !syncedLegacyRef.current) {
          syncedLegacyRef.current = true;
          unsyncedFavs.forEach((id) => remoteSaved.add(id));
          fetch("/api/me/radar/bids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ savedBidIds: unsyncedFavs }),
          }).catch(() => undefined);
        }

        setFilters(remoteFilters);
        setSavedBidIds(remoteSaved);
        setHiddenBidIds(remoteHidden);
        persistLocalSnapshot(remoteFilters, remoteSaved, remoteHidden);
        setLoadingRadar(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingRadar(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cnpj, persistLocalSnapshot]);

  const toggleSavedBid = useCallback(
    (bidControlId: string): boolean => {
      let nextState = false;
      setSavedBidIds((prev) => {
        const next = new Set(prev);
        if (next.has(bidControlId)) {
          next.delete(bidControlId);
          nextState = false;
        } else {
          next.add(bidControlId);
          nextState = true;
        }
        persistLocalSnapshot(filters, next, hiddenBidIds);
        return next;
      });

      fetch("/api/me/radar/bids", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidControlId, isSaved: nextState }),
      }).catch(() => undefined);

      return nextState;
    },
    [filters, hiddenBidIds, persistLocalSnapshot],
  );

  const toggleHiddenBid = useCallback(
    (bidControlId: string): boolean => {
      let nextState = false;
      setHiddenBidIds((prev) => {
        const next = new Set(prev);
        if (next.has(bidControlId)) {
          next.delete(bidControlId);
          nextState = false;
        } else {
          next.add(bidControlId);
          nextState = true;
        }
        persistLocalSnapshot(filters, savedBidIds, next);
        return next;
      });

      fetch("/api/me/radar/bids", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidControlId, isHidden: nextState }),
      }).catch(() => undefined);

      return nextState;
    },
    [filters, savedBidIds, persistLocalSnapshot],
  );

  const createFilter = useCallback(
    async (payload: {
      name: string;
      isDefault?: boolean;
      config: RadarFilterConfig;
    }): Promise<SavedRadarFilter> => {
      setSavingFilter(true);
      try {
        const res = await fetch("/api/me/radar/filters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let created: SavedRadarFilter;
        if (res.ok) {
          created = normalizeFilterFromApi((await res.json()) as SavedRadarFilter);
        } else {
          created = {
            id: `local-${Date.now()}`,
            name: payload.name,
            isDefault: Boolean(payload.isDefault || filters.length === 0),
            config: payload.config,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        setFilters((prev) => {
          const base = created.isDefault
            ? prev.map((f) => ({ ...f, isDefault: false }))
            : prev;
          const next = [created, ...base];
          persistLocalSnapshot(next, savedBidIds, hiddenBidIds);
          return next;
        });

        return created;
      } finally {
        setSavingFilter(false);
      }
    },
    [filters.length, hiddenBidIds, persistLocalSnapshot, savedBidIds],
  );

  const updateFilter = useCallback(
    async (
      id: string,
      payload: {
        name: string;
        isDefault?: boolean;
        config: RadarFilterConfig;
      },
    ): Promise<SavedRadarFilter> => {
      setSavingFilter(true);
      try {
        const res = await fetch(
          `/api/me/radar/filters/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        let updated: SavedRadarFilter;
        if (res.ok) {
          updated = normalizeFilterFromApi((await res.json()) as SavedRadarFilter);
        } else {
          updated = {
            id,
            name: payload.name,
            isDefault: Boolean(payload.isDefault),
            config: payload.config,
            updatedAt: new Date().toISOString(),
          };
        }

        setFilters((prev) => {
          const next = prev.map((f) => {
            if (f.id === id) return updated;
            if (updated.isDefault) return { ...f, isDefault: false };
            return f;
          });
          persistLocalSnapshot(next, savedBidIds, hiddenBidIds);
          return next;
        });

        return updated;
      } finally {
        setSavingFilter(false);
      }
    },
    [hiddenBidIds, persistLocalSnapshot, savedBidIds],
  );

  const deleteFilter = useCallback(
    async (id: string) => {
      setSavingFilter(true);
      try {
        await fetch(`/api/me/radar/filters/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }).catch(() => undefined);

        setFilters((prev) => {
          const next = prev.filter((f) => f.id !== id);
          persistLocalSnapshot(next, savedBidIds, hiddenBidIds);
          return next;
        });
      } finally {
        setSavingFilter(false);
      }
    },
    [hiddenBidIds, persistLocalSnapshot, savedBidIds],
  );

  const savedBidIdsList = useMemo(
    () => Array.from(savedBidIds),
    [savedBidIds],
  );
  const hiddenBidIdsList = useMemo(
    () => Array.from(hiddenBidIds),
    [hiddenBidIds],
  );

  return {
    filters,
    savedBidIds,
    savedBidIdsList,
    hiddenBidIds,
    hiddenBidIdsList,
    loadingRadar,
    savingFilter,
    toggleSavedBid,
    toggleHiddenBid,
    createFilter,
    updateFilter,
    deleteFilter,
  };
}
