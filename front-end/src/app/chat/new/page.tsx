"use function";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewChatRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // مستقیماً به صفحه چت خالی هدایت می‌شود بدون ساختن ID
    router.replace("/chat");
  }, [router]);

  return null;
}