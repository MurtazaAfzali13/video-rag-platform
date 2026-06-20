"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatbotRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
    <main className="flex h-screen w-full items-center justify-center bg-[#050816] text-slate-400">
      Redirecting…
    </main>
  );
}
