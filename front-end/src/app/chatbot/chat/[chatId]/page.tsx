"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation"; // useRouter اضافه شد
import { useChatUserId } from "@/hooks/useChatUserId";
import { useVideo } from "@/context/VideoContext";
import { fetchChatMeta, fetchChatMessages, sendChatMessage } from "@/lib/chat-api";
import { parseTimestampsFromText } from "@/lib/utils";
import type { Message, Chat } from "@/types";
import VideoTimelinePanel from "@/components/video/VideoTimelinePanel";
import ChatInterface from "@/components/chat/ChatInterface";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter(); // اضافه شد
  const chatId = params.chatId as string;
  const initialVideoUrl = searchParams.get("videoUrl");
  const userId = useChatUserId();
  
  const { setActiveVideoId, setTimelineItems } = useVideo();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  
  const messageIdCounter = useRef(0);
  const processingTriggered = useRef(false);

  const loadChatData = useCallback(() => {
    if (!chatId || !userId) return;
    setIsLoadingChat(true);

    Promise.all([
      fetchChatMeta(chatId, userId),
      fetchChatMessages(chatId, userId),
    ])
      .then(([meta, msgs]) => {
        setChat(meta);
        setMessages(msgs);
        if (meta.video_id) {
          setActiveVideoId(meta.video_id);
        }

        const timeline: Array<{ id: string; time: string; title: string }> = [];
        msgs.forEach((msg: Message) => {
          if (msg.role === "assistant") {
            const timestamps = parseTimestampsFromText(msg.content);
            timestamps.forEach(({ time }, i) => {
              const id = `${msg.id}-${i}`;
              if (!timeline.find((t) => t.time === time)) {
                timeline.push({ id, time, title: `From history` });
              }
            });
          }
        });
        if (timeline.length) setTimelineItems(timeline);
      })
      .catch((err) => {
        console.error("Error loading chat context:", err);
      })
      .finally(() => setIsLoadingChat(false));
  }, [chatId, userId, setActiveVideoId, setTimelineItems]);

  useEffect(() => {
    if (!initialVideoUrl) {
      loadChatData();
    }
  }, [chatId, userId, initialVideoUrl, loadChatData]);

  useEffect(() => {
    if (initialVideoUrl && userId && chatId && !processingTriggered.current) {
      processingTriggered.current = true;
      
      const processVideo = async () => {
        setIsVideoProcessing(true);
        setIsLoadingChat(true);
        try {
          const res = await fetch("/api/process-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              video_url: initialVideoUrl,
              user_id: userId,
              chat_id: chatId,
            }),
          });
          const data = await res.json();
          
          if (!res.ok) {
            console.error("Process video error:", data);
            // ✅ اصلاح اصلی: نمایش پیام خطای ارسالی از سرور
            alert(data.error || "خطا در پردازش ویدیو. لطفاً دوباره تلاش کنید.");
            // کاربر را به صفحه اصلی برمی‌گردانیم تا در صفحه خالی نماند
            router.push("/chatbot");
            return;
          }

          setActiveVideoId(data.video_id);
          loadChatData();
        } catch (error) {
          console.error("Failed to process video:", error);
          alert("خطای ارتباط با سرور. لطفاً دوباره تلاش کنید.");
          router.push("/chatbot"); // برگشت به صفحه اصلی در صورت خطای شبکه
        } finally {
          setIsVideoProcessing(false);
          setIsLoadingChat(false);
        }
      };

      processVideo();
    }
  }, [initialVideoUrl, userId, chatId, setActiveVideoId, loadChatData, router]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      // بقیه کدهای این بخش بدون تغییر است...
      if (!userId || !content.trim()) return;

      const userMsg: Message = {
        id: `local-user-${++messageIdCounter.current}`,
        chat_id: chatId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const data = await sendChatMessage(content, userId, chatId, chat?.video_id ?? null);

        const assistantMsg: Message = {
          id: `local-ai-${++messageIdCounter.current}`,
          chat_id: chatId,
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        const timestamps = parseTimestampsFromText(data.response);
        if (timestamps.length > 0) {
          setTimelineItems((prev) => {
            const newItems = timestamps
              .filter((t) => !prev.find((p) => p.time === t.time))
              .map(({ time }, i) => ({
                id: `${assistantMsg.id}-${i}`,
                time,
                title: content.slice(0, 50),
              }));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsTyping(false);
      }
    },
    [userId, chatId, chat?.video_id, setTimelineItems]
  );

  if (!userId) return null;

  return (
    <div className="flex flex-1 h-full min-w-0 overflow-hidden bg-[#050816]">
      <div className="w-[45%] min-w-[350px] border-r border-slate-800/50 bg-[#08101F]">
        <VideoTimelinePanel
          chatId={chatId}
          userId={userId}
          isProcessingExt={isVideoProcessing}
        />
      </div>

      <div className="flex-1 min-w-[400px]">
        <ChatInterface
          chatId={chatId}
          chat={chat}
          messages={messages}
          isLoading={isLoadingChat}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}