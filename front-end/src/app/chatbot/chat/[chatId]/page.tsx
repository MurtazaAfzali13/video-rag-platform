"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation"; // useRouter اضافه شد
import { useChatUserId } from "@/hooks/useChatUserId";
import { useVideo } from "@/context/VideoContext";
import { fetchChatMeta, fetchChatMessages, sendChatMessage } from "@/lib/chat-api";
import type { Message, Chat } from "@/types";
import VideoTimelinePanel from "@/components/video/VideoTimelinePanel";
import ChatInterface from "@/components/chat/ChatInterface";

function formatSecondsToTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter(); // اضافه شد
  const chatId = params.chatId as string;
  const initialVideoUrl = searchParams.get("videoUrl");
  const userId = useChatUserId();
  
  const { setActiveVideoId, setTimelineItems, timelineItems } = useVideo();

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

        const timeline: Array<{ id: string; time: string; title: string; description?: string }> = [];
        msgs.forEach((msg: Message) => {
          if (msg.role !== "assistant") return;

          // پیام‌ها JSON ساختاریافته از بک‌اند هستند (qa_response یا video_summary).
          // عنوان هر آیتم تایم‌لاین باید از خودِ محتوای ویدیو (title/point) بیاید،
          // نه از سوالی که کاربر پرسیده.
          try {
            const parsed = JSON.parse(msg.content);

            if (parsed?.type === "qa_response" && Array.isArray(parsed.sources)) {
              parsed.sources.forEach((source: any, i: number) => {
                if (source.source_type === "video" && source.start_time !== undefined && source.start_time !== null) {
                  const time = formatSecondsToTimestamp(source.start_time);
                  if (!timeline.find((t) => t.time === time)) {
                    timeline.push({
                      id: `${msg.id}-src-${i}`,
                      time,
                      title: source.title || "بخش نامشخص",
                      description: source.description,
                    });
                  }
                }
              });
            } else if (parsed?.type === "video_summary" && Array.isArray(parsed.key_takeaways)) {
              parsed.key_takeaways.forEach((k: any, i: number) => {
                if (k.timestamp && !timeline.find((t) => t.time === k.timestamp)) {
                  timeline.push({
                    id: `${msg.id}-kt-${i}`,
                    time: k.timestamp,
                    title: k.point?.slice(0, 60) ?? "نکته کلیدی",
                  });
                }
              });
            }
          } catch {
            // پیام قدیمی/متنی (Legacy) است، نه JSON — چیزی برای استخراج امن نداریم، رد می‌شویم.
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

        // مهم: اینجا دیگر از سوال کاربر (`content`) به عنوان عنوان تایم‌لاین استفاده نمی‌کنیم.
        // عنوان و توضیح واقعی هر رفرنس از خودِ پاسخ ساختاریافته (sources / key_takeaways)
        // که مدل بر اساس محتوای ویدیو تولید کرده می‌آید.
        try {
          const parsed = JSON.parse(data.response);
          let newItems: typeof timelineItems = [];

          if (parsed?.type === "qa_response" && Array.isArray(parsed.sources)) {
            newItems = parsed.sources
              .filter(
                (s: any) =>
                  s.source_type === "video" && s.start_time !== undefined && s.start_time !== null
              )
              .map((s: any, i: number) => ({
                id: `${assistantMsg.id}-src-${i}`,
                time: formatSecondsToTimestamp(s.start_time),
                title: s.title || "بخش نامشخص",
                description: s.description,
              }));
          } else if (parsed?.type === "video_summary" && Array.isArray(parsed.key_takeaways)) {
            newItems = parsed.key_takeaways
              .filter((k: any) => !!k.timestamp)
              .map((k: any, i: number) => ({
                id: `${assistantMsg.id}-kt-${i}`,
                time: k.timestamp,
                title: k.point?.slice(0, 60) ?? "نکته کلیدی",
              }));
          }

          const dedupedNewItems = newItems.filter(
            (item) => !timelineItems.find((p) => p.time === item.time)
          );

          if (dedupedNewItems.length) {
            setTimelineItems([...timelineItems, ...dedupedNewItems]);
          }
        } catch {
          // پاسخ JSON ساختاریافته نبود (حالت Legacy متنی) — چیزی برای استخراج امن نداریم.
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsTyping(false);
      }
    },
    [userId, chatId, chat?.video_id, setTimelineItems, timelineItems]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setTimelineItems([]);
  }, [setTimelineItems]);

  if (!userId) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#050816] md:flex-row">
      <div className="w-full shrink-0 border-b border-slate-800/50 bg-[#08101F] md:h-full md:w-[45%] md:min-w-[350px] md:border-b-0 md:border-r">
        <VideoTimelinePanel
          chatId={chatId}
          userId={userId}
          isProcessingExt={isVideoProcessing}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatInterface
          chatId={chatId}
          chat={chat}
          messages={messages}
          isLoading={isLoadingChat}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
        />
      </div>
    </div>
  );
}