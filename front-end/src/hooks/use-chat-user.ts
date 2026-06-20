"use client";

import { useUser } from "@clerk/nextjs";

export function useChatUserId(): string {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return "";
  return user?.id ?? "";
}
