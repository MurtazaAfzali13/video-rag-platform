"use client";

import { useUser } from "@clerk/nextjs";

export function useChatUserId(): string | null {
  const { user } = useUser();
  return user?.id ?? null;
}

export function useUserRole(): "admin" | "user" | null {
  const { user } = useUser();
  if (!user) return null;
  const role = user.publicMetadata?.role as string | undefined;
  return role === "admin" ? "admin" : "user";
}
