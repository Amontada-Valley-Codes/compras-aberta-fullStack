"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MePncpBid } from "./cnae-match";
import {
  buildCalendarEvents,
  createDefaultQualificationChecklist,
  snapshotFromBid,
  type AgendaEventType,
  type AgendaReminder,
  type BidStage,
  type TrackedBid,
  type TrackedBidItem,
  type TrackedBidMetadata,
} from "./workspace-types";

interface WorkspaceApiPayload {
  trackedBids: TrackedBid[];
  reminders: AgendaReminder[];
}

function getWorkspaceCacheKey(cnpj?: string | null) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return `compras-abertas:me-workspace:${clean || "default"}`;
}

function normalizeTrackedBid(raw: Partial<TrackedBid> & { bidControlId: string }): TrackedBid {
  const rawMeta =
    raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {};
  return {
    id: raw.id ?? `local-${raw.bidControlId}`,
    bidControlId: raw.bidControlId,
    stage: (raw.stage as BidStage) ?? "analise",
    nickname: raw.nickname ?? null,
    customStatus: raw.customStatus ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    notes: typeof raw.notes === "string" ? raw.notes : "",
    bidSnapshot: (raw.bidSnapshot ?? { id: raw.bidControlId }) as MePncpBid,
    metadata: {
      proposalValidity: "60 dias",
      qualificationChecklist: createDefaultQualificationChecklist(),
      ...rawMeta,
    },
    items: Array.isArray(raw.items) ? raw.items : [],
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeReminder(raw: AgendaReminder): AgendaReminder {
  return {
    id: raw.id,
    trackedBidId: raw.trackedBidId ?? null,
    title: raw.title,
    description: raw.description ?? null,
    dueAt: raw.dueAt,
    type: raw.type ?? "lembrete",
    completed: Boolean(raw.completed),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function useBidWorkspace(
  cnpj?: string | null,
  legacySavedBidIds?: Set<string>,
  openBids?: MePncpBid[],
) {
  const [trackedBids, setTrackedBids] = useState<TrackedBid[]>([]);
  const [reminders, setReminders] = useState<AgendaReminder[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const migratedLegacyIdsRef = useRef<Set<string>>(new Set());

  const persistLocal = useCallback(
    (nextBids: TrackedBid[], nextReminders: AgendaReminder[]) => {
      if (typeof window === "undefined") return;
      try {
        const payload: WorkspaceApiPayload = {
          trackedBids: nextBids,
          reminders: nextReminders,
        };
        window.localStorage.setItem(
          getWorkspaceCacheKey(cnpj),
          JSON.stringify(payload),
        );
      } catch {
        // ignora limite de storage
      }
    },
    [cnpj],
  );

  // Hidrata cache local e sincroniza com /api/me/workspace
  useEffect(() => {
    let cancelled = false;

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(getWorkspaceCacheKey(cnpj));
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<WorkspaceApiPayload>;
          if (Array.isArray(parsed.trackedBids)) {
            setTrackedBids(parsed.trackedBids.map(normalizeTrackedBid));
          }
          if (Array.isArray(parsed.reminders)) {
            setReminders(parsed.reminders.map(normalizeReminder));
          }
        }
      } catch {
        // ignora
      }
    }

    fetch("/api/me/workspace")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as WorkspaceApiPayload;
      })
      .then((remote) => {
        if (cancelled) return;
        if (remote) {
          const normBids = (remote.trackedBids ?? []).map(normalizeTrackedBid);
          const normRems = (remote.reminders ?? []).map(normalizeReminder);
          setTrackedBids(normBids);
          setReminders(normRems);
          persistLocal(normBids, normRems);
        }
        setLoadingWorkspace(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cnpj, persistLocal]);

  const trackedBidsMap = useMemo(() => {
    const map = new Map<string, TrackedBid>();
    for (const tb of trackedBids) {
      map.set(tb.bidControlId, tb);
    }
    return map;
  }, [trackedBids]);

  // Migração transparente de licitações favoritadas anteriormente para a fase "Análise"
  useEffect(() => {
    if (loadingWorkspace || !legacySavedBidIds || !openBids?.length) return;

    const toMigrate: MePncpBid[] = [];
    for (const savedId of legacySavedBidIds) {
      if (
        !trackedBidsMap.has(savedId) &&
        !migratedLegacyIdsRef.current.has(savedId)
      ) {
        const found = openBids.find((b) => b.id === savedId);
        if (found) {
          migratedLegacyIdsRef.current.add(savedId);
          toMigrate.push(found);
        }
      }
    }

    if (toMigrate.length === 0) return;

    const createdEntries = toMigrate.map((bid) =>
      normalizeTrackedBid({
        bidControlId: bid.id,
        stage: "analise",
        bidSnapshot: snapshotFromBid(bid),
      }),
    );

    setTrackedBids((prev) => {
      const existingSet = new Set(prev.map((p) => p.bidControlId));
      const merged = [
        ...createdEntries.filter((c) => !existingSet.has(c.bidControlId)),
        ...prev,
      ];
      persistLocal(merged, reminders);
      return merged;
    });

    for (const entry of createdEntries) {
      fetch("/api/me/workspace/bids", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidControlId: entry.bidControlId,
          stage: "analise",
          bidSnapshot: entry.bidSnapshot,
          metadata: entry.metadata,
        }),
      })
        .then(async (r) => (r.ok ? ((await r.json()) as TrackedBid) : null))
        .then((saved) => {
          if (!saved) return;
          setTrackedBids((prev) =>
            prev.map((item) =>
              item.bidControlId === saved.bidControlId
                ? normalizeTrackedBid(saved)
                : item,
            ),
          );
        })
        .catch(() => undefined);
    }
  }, [
    legacySavedBidIds,
    loadingWorkspace,
    openBids,
    persistLocal,
    reminders,
    trackedBidsMap,
  ]);

  const upsertTrackedBid = useCallback(
    async (
      bidControlId: string,
      patch: {
        stage?: BidStage;
        nickname?: string | null;
        customStatus?: string | null;
        tags?: string[];
        notes?: string;
        bidSnapshot?: MePncpBid;
        metadata?: Partial<TrackedBidMetadata>;
        items?: TrackedBidItem[];
      },
    ): Promise<TrackedBid> => {
      const nowIso = new Date().toISOString();
      let optimisticResult!: TrackedBid;

      setTrackedBids((prev) => {
        const existing = prev.find((b) => b.bidControlId === bidControlId);
        if (existing) {
          optimisticResult = {
            ...existing,
            ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
            ...(patch.nickname !== undefined ? { nickname: patch.nickname } : {}),
            ...(patch.customStatus !== undefined
              ? { customStatus: patch.customStatus }
              : {}),
            ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.bidSnapshot !== undefined
              ? { bidSnapshot: snapshotFromBid(patch.bidSnapshot) }
              : {}),
            ...(patch.metadata !== undefined
              ? { metadata: { ...existing.metadata, ...patch.metadata } }
              : {}),
            ...(patch.items !== undefined ? { items: patch.items } : {}),
            updatedAt: nowIso,
          };
          const next = prev.map((b) =>
            b.bidControlId === bidControlId ? optimisticResult : b,
          );
          persistLocal(next, reminders);
          return next;
        }

        optimisticResult = normalizeTrackedBid({
          bidControlId,
          stage: patch.stage ?? "analise",
          nickname: patch.nickname ?? null,
          customStatus: patch.customStatus ?? null,
          tags: patch.tags ?? [],
          notes: patch.notes ?? "",
          bidSnapshot: patch.bidSnapshot
            ? snapshotFromBid(patch.bidSnapshot)
            : ({ id: bidControlId } as MePncpBid),
          metadata: patch.metadata,
          items: patch.items ?? [],
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        const next = [optimisticResult, ...prev];
        persistLocal(next, reminders);
        return next;
      });

      try {
        const res = await fetch("/api/me/workspace/bids", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bidControlId,
            ...patch,
            ...(patch.bidSnapshot
              ? { bidSnapshot: snapshotFromBid(patch.bidSnapshot) }
              : {}),
          }),
        });

        if (res.ok) {
          const remoteSaved = normalizeTrackedBid(
            (await res.json()) as TrackedBid,
          );
          setTrackedBids((prev) => {
            const next = prev.map((b) =>
              b.bidControlId === bidControlId ? remoteSaved : b,
            );
            persistLocal(next, reminders);
            return next;
          });
          return remoteSaved;
        }
      } catch {
        // mantém versão otimista local
      }

      return optimisticResult;
    },
    [persistLocal, reminders],
  );

  const removeTrackedBid = useCallback(
    async (bidControlId: string) => {
      setTrackedBids((prev) => {
        const next = prev.filter((b) => b.bidControlId !== bidControlId);
        persistLocal(next, reminders);
        return next;
      });

      await fetch(
        `/api/me/workspace/bids?bidControlId=${encodeURIComponent(bidControlId)}`,
        { method: "DELETE" },
      ).catch(() => undefined);
    },
    [persistLocal, reminders],
  );

  const toggleAnalysisBid = useCallback(
    async (bid: MePncpBid): Promise<"added" | "removed" | "already_participating"> => {
      const existing = trackedBidsMap.get(bid.id);
      if (existing) {
        if (existing.stage === "analise") {
          await removeTrackedBid(bid.id);
          return "removed";
        }
        return "already_participating";
      }

      await upsertTrackedBid(bid.id, {
        stage: "analise",
        bidSnapshot: bid,
      });
      return "added";
    },
    [removeTrackedBid, trackedBidsMap, upsertTrackedBid],
  );

  const confirmParticipation = useCallback(
    async (
      bid: MePncpBid,
      payload: {
        nickname?: string;
        items: TrackedBidItem[];
      },
    ): Promise<TrackedBid> => {
      const existing = trackedBidsMap.get(bid.id);
      const nextStage: BidStage =
        existing &&
        existing.stage !== "analise" &&
        existing.stage !== "desistida"
          ? existing.stage
          : "proposta";

      return upsertTrackedBid(bid.id, {
        stage: nextStage,
        nickname:
          payload.nickname !== undefined
            ? payload.nickname.trim() || null
            : (existing?.nickname ?? null),
        bidSnapshot: bid,
        items: payload.items,
      });
    },
    [trackedBidsMap, upsertTrackedBid],
  );

  const createReminder = useCallback(
    async (input: {
      title: string;
      description?: string;
      dueAt: string;
      type?: AgendaEventType;
      trackedBidId?: string | null;
    }): Promise<AgendaReminder> => {
      const tempId = `local-rem-${Date.now()}`;
      const optimistic: AgendaReminder = {
        id: tempId,
        trackedBidId: input.trackedBidId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        dueAt: input.dueAt,
        type: input.type ?? "lembrete",
        completed: false,
      };

      setReminders((prev) => {
        const next = [...prev, optimistic].sort((a, b) =>
          a.dueAt.localeCompare(b.dueAt),
        );
        persistLocal(trackedBids, next);
        return next;
      });

      try {
        const res = await fetch("/api/me/workspace/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: optimistic.title,
            description: optimistic.description,
            dueAt: optimistic.dueAt,
            type: optimistic.type,
            trackedBidId:
              optimistic.trackedBidId && !optimistic.trackedBidId.startsWith("local-")
                ? optimistic.trackedBidId
                : null,
          }),
        });

        if (res.ok) {
          const created = normalizeReminder((await res.json()) as AgendaReminder);
          setReminders((prev) => {
            const next = prev.map((r) => (r.id === tempId ? created : r));
            persistLocal(trackedBids, next);
            return next;
          });
          return created;
        }
      } catch {
        // mantém versão local
      }

      return optimistic;
    },
    [persistLocal, trackedBids],
  );

  const updateReminder = useCallback(
    async (
      reminderId: string,
      patch: Partial<
        Pick<
          AgendaReminder,
          "title" | "description" | "dueAt" | "type" | "completed"
        >
      >,
    ) => {
      setReminders((prev) => {
        const next = prev.map((r) =>
          r.id === reminderId ? { ...r, ...patch } : r,
        );
        persistLocal(trackedBids, next);
        return next;
      });

      if (!reminderId.startsWith("local-")) {
        await fetch(
          `/api/me/workspace/reminders/${encodeURIComponent(reminderId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        ).catch(() => undefined);
      }
    },
    [persistLocal, trackedBids],
  );

  const deleteReminder = useCallback(
    async (reminderId: string) => {
      setReminders((prev) => {
        const next = prev.filter((r) => r.id !== reminderId);
        persistLocal(trackedBids, next);
        return next;
      });

      if (!reminderId.startsWith("local-")) {
        await fetch(
          `/api/me/workspace/reminders/${encodeURIComponent(reminderId)}`,
          { method: "DELETE" },
        ).catch(() => undefined);
      }
    },
    [persistLocal, trackedBids],
  );

  const allTrackedBidIds = useMemo(
    () => new Set(trackedBids.map((t) => t.bidControlId)),
    [trackedBids],
  );

  const activeTrackedCount = useMemo(
    () => trackedBids.filter((t) => t.stage !== "desistida").length,
    [trackedBids],
  );

  const calendarEvents = useMemo(
    () => buildCalendarEvents(trackedBids, reminders),
    [trackedBids, reminders],
  );

  const upcoming7DaysCount = useMemo(() => {
    const now = Date.now();
    const limit = now + 7 * 86_400_000;
    return calendarEvents.filter((ev) => {
      if (ev.completed) return false;
      const ms = new Date(ev.dueAt).getTime();
      return ms >= now - 3600_000 && ms <= limit;
    }).length;
  }, [calendarEvents]);

  return {
    trackedBids,
    trackedBidsMap,
    allTrackedBidIds,
    activeTrackedCount,
    reminders,
    calendarEvents,
    upcoming7DaysCount,
    loadingWorkspace,
    upsertTrackedBid,
    removeTrackedBid,
    toggleAnalysisBid,
    confirmParticipation,
    createReminder,
    updateReminder,
    deleteReminder,
  };
}
