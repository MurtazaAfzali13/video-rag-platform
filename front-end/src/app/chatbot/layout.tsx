import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VideoProvider } from "@/context/VideoContext";
import ChatSidebar from "@/components/chat/ChatSidebar";

export default async function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <VideoProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#050816]">
        <ChatSidebar />
        <main className="flex flex-1 min-w-0 overflow-hidden">{children}</main>
      </div>
    </VideoProvider>
  );
}
