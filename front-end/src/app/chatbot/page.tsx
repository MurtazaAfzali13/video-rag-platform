
import { ChatHistorySidebar } from "@/components/chatbot/chat-history-sidebar";
import { VideoTimelinePanel } from "@/components/chatbot/video-timeline-panel";
import ChatPage from "@/components/chatbot/ai-assistant-panel";
import { VideoProvider } from "@/context/VideoContext";

export default function ChatbotPage() {
  return (

    <main className="flex h-screen w-full overflow-hidden text-slate-200">
      <VideoProvider>
        <ChatHistorySidebar />
        <VideoTimelinePanel />
        <ChatPage />
      </VideoProvider>
    </main>
  );
}