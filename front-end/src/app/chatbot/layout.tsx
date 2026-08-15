import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VideoProvider } from "@/context/VideoContext";
import { SidebarProvider } from "@/context/SidebarContext";
import ChatbotShell from "@/components/chat/ChatbotShell";

export default async function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <SidebarProvider>
      <VideoProvider>
        <ChatbotShell>{children}</ChatbotShell>
      </VideoProvider>
    </SidebarProvider>
  );
}
