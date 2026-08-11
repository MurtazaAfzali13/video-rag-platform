"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface UserOverview {
  user_id: string;
  // 🆕 Resolved via Clerk in /api/users/route.ts — falls back to the raw
  // user_id (and null email/image_url) if Clerk enrichment fails for any
  // reason, so this page never breaks even if Clerk is unreachable.
  name: string;
  email: string | null;
  image_url: string | null;
  chats_count: number;
  videos_count: number;
  questions_count: number;
  last_active: string | null;
}

interface UsersContextValue {
  users: UserOverview[];
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserOverview[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // No client-side token handling needed: /api/users is a Next.js route
      // that reads the Clerk session server-side (same pattern as
      // /api/process-video) and forwards a verified bearer token to FastAPI.
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "خطا در دریافت لیست کاربران.");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
      setIsAdmin(Boolean(data.is_admin));
    } catch (err) {
      console.error("UsersContext fetch failed:", err);
      setError(err instanceof Error ? err.message : "خطای ناشناخته در دریافت کاربران.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <UsersContext.Provider value={{ users, isAdmin, isLoading, error, refetch: fetchUsers }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) {
    throw new Error("useUsers must be used within a <UsersProvider>");
  }
  return ctx;
}
