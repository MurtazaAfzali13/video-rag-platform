"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatbotSessionRedirectPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const router = useRouter();
  const { chatId } = use(params);

  useEffect(() => {
    router.replace(`/chat/${chatId}`);
  }, [router, chatId]);

  return null;
}
