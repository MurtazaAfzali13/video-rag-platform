"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import useSWR, { SWRConfig, type Cache } from "swr";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const VIDEOS_PAGE_SIZE = 10;

/**
 * The video list is effectively static data (YouTube thumbnails don't
 * change, and a new video appearing isn't urgent) — so instead of
 * refetching on every mount/navigation, we only auto-refresh every 2 hours.
 *
 * Two SWR settings do the actual work, and both matter:
 * - `dedupingInterval`: within this window, re-mounting the hook (switching
 *   pages and coming back, re-rendering, etc.) reuses the in-memory cache
 *   instead of firing a new request at all.
 * - `refreshInterval`: while a <VideoProvider> stays mounted (e.g. the user
 *   leaves the dashboard tab open), SWR still proactively re-checks on this
 *   cadence so newly added videos eventually show up without a manual reload.
 *
 * Caveat worth knowing: this only holds within one browser session/tab. A
 * hard page reload (F5, closing and reopening the tab) starts a fresh SWR
 * instance, so it always does one real fetch on load — that's just normal
 * page-load behavior and is cheap (one request). The `localStorageProvider`
 * below softens that case too: it shows the last-known thumbnails instantly
 * instead of a loading skeleton while that one fetch resolves in the
 * background.
 */
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const LOCAL_CACHE_STORAGE_KEY = "video-dashboard-swr-cache-v1";

/**
 * Persists the SWR cache to localStorage so a hard page reload can paint
 * previously-seen thumbnails immediately instead of a blank loading state.
 * Scoped to this context only (via the nested <SWRConfig> below), so it
 * never touches the cache used by MonitoringContext or other dashboard data.
 */
function localStorageProvider(): Cache {
  if (typeof window === "undefined") {
    // SSR / no browser storage available — plain in-memory map for this render.
    return new Map();
  }

  let initialEntries: [string, unknown][] = [];
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_STORAGE_KEY);
    if (raw) initialEntries = JSON.parse(raw);
  } catch {
    initialEntries = [];
  }

  const map = new Map(initialEntries) as Cache;

  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem(LOCAL_CACHE_STORAGE_KEY, JSON.stringify(Array.from((map as Map<string, unknown>).entries())));
    } catch {
      // Storage full/unavailable (e.g. private browsing) — safe to skip;
      // SWR keeps working in-memory for the rest of this session.
    }
  });

  return map;
}

export interface VideoItem {
  id: string;
  youtube_id: string;
  title: string;
  created_at: string;
}

interface VideoListResponse {
  videos: VideoItem[];
  total_count: number;
  limit: number;
  offset: number;
  cached: boolean;
}

interface TodayCountResponse {
  count: number;
  cached: boolean;
}

interface VideoContextValue {
  /** Current page of videos (already RBAC-scoped server-side). */
  videos: VideoItem[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;

  page: number;
  totalPages: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  refresh: () => void;

  todayCount: number | null;
  todayCountLoading: boolean;
}

const VideoContext = createContext<VideoContextValue | undefined>(undefined);

/** Attaches the caller's Clerk session token; matches how other dashboard
 * contexts in this app (e.g. MonitoringContext) authenticate requests. */
function useAuthedFetcher() {
  const { getToken } = useAuth();

  return async (url: string) => {
    const token = await getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}): ${body || res.statusText}`);
    }

    return res.json();
  };
}

function VideoProviderInner({ children }: { children: ReactNode }) {
  const [page, setPage] = useState(1);
  const fetcher = useAuthedFetcher();
  const offset = (page - 1) * VIDEOS_PAGE_SIZE;

  const {
    data: listData,
    error: listError,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR<VideoListResponse>(
    `${API_BASE}/api/videos?limit=${VIDEOS_PAGE_SIZE}&offset=${offset}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // Core of the "just show cached thumbnails, recheck every 2h" behavior:
      dedupingInterval: TWO_HOURS_MS,
      refreshInterval: TWO_HOURS_MS,
    }
  );

  const { data: todayData, isLoading: todayLoading } = useSWR<TodayCountResponse>(
    `${API_BASE}/api/videos/stats/today`,
    fetcher,
    {
      revalidateOnFocus: false,
      // The backend already caches this for 5 minutes; matching the client's
      // refresh interval avoids polling more often than the value can change.
      refreshInterval: 5 * 60 * 1000,
    }
  );

  const totalCount = listData?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / VIDEOS_PAGE_SIZE));

  const value = useMemo<VideoContextValue>(() => {
    const clamp = (next: number) => Math.min(Math.max(1, next), totalPages);

    return {
      videos: listData?.videos ?? [],
      totalCount,
      isLoading: listLoading,
      error: listError ?? null,

      page,
      totalPages,
      pageSize: VIDEOS_PAGE_SIZE,
      goToPage: (next: number) => setPage(clamp(next)),
      nextPage: () => setPage((current) => clamp(current + 1)),
      previousPage: () => setPage((current) => clamp(current - 1)),
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,

      // Manual escape hatch: e.g. a "refresh" button the user can click to
      // force a real fetch without waiting for the 2-hour window.
      refresh: () => mutateList(),

      todayCount: todayData?.count ?? null,
      todayCountLoading: todayLoading,
    };
  }, [listData, listLoading, listError, page, totalPages, mutateList, todayData, todayLoading]);

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}

export function VideoProvider({ children }: { children: ReactNode }) {
  // Nested SWRConfig scopes both the localStorage-backed cache and the
  // provider itself to just this subtree — it does not affect SWR usage
  // anywhere else in the dashboard (MonitoringContext, DashboardContext, ...).
  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
      <VideoProviderInner>{children}</VideoProviderInner>
    </SWRConfig>
  );
}

export function useVideos(): VideoContextValue {
  const ctx = useContext(VideoContext);
  if (!ctx) {
    throw new Error("useVideos must be used within a <VideoProvider>");
  }
  return ctx;
}
