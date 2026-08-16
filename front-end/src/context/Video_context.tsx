"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import useSWR, { SWRConfig, type Cache } from "swr";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const VIDEOS_PAGE_SIZE = 10;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const LOCAL_CACHE_STORAGE_KEY = "video-dashboard-swr-cache-v1";


function localStorageProvider(): Cache {
  if (typeof window === "undefined") {
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
