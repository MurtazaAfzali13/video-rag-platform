import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VideoProvider } from "@/context/VideoContext";
import ChatbotShell from "@/components/chat/ChatbotShell";

export default async function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <VideoProvider>
      <ChatbotShell>{children}</ChatbotShell>
    </VideoProvider>
  );
}
