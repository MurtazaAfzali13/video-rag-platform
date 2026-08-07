"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useChatUserId } from "@/hooks/useChatUserId";
import { useVideo } from "@/context/VideoContext";
import { fetchChatMeta, fetchChatMessages, sendChatMessage } from "@/lib/chat-api";
import { parseTimestampsFromText } from "@/lib/utils";
import type { Message, Chat } from "@/types";
import VideoTimelinePanel from "@/components/video/VideoTimelinePanel";
import ChatInterface from "@/components/chat/ChatInterface";

// 🛡️ پوشش امنیتی: وارد کردن هوک کلرک
import { useAuth } from "@clerk/nextjs";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const initialVideoUrl = searchParams.get("videoUrl");
  const userId = useChatUserId();
  
  // 🛡️ دریافت تابع استخراج توکن کلرک
  const { getToken } = useAuth();
  
  const { setActiveVideoId, setTimelineItems, hydrateFromChat } = useVideo();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  
  const messageIdCounter = useRef(0);
  const processingTriggered = useRef(false);

  const loadChatData = useCallback(async () => {
    if (!chatId) return;
    setIsLoadingChat(true);

    try {
      // 🛡️ دریافت توکن برای ارسال به توابع chat-api
      const token = await getToken();
      
      // 🛡️ رفع خطای تایپ‌اسکریپت (Type Narrowing)
      if (!token) {
        throw new Error("احراز هویت نامعتبر است (توکن یافت نشد).");
      }
      
      const [meta, msgs] = await Promise.all([
        fetchChatMeta(chatId, token),
        fetchChatMessages(chatId, token),
      ]);
      
      setChat(meta);
      setMessages(msgs);

      // 🔧 فیکس: اول همیشه دیتای واقعی و ذخیره‌شده‌ی چت (سرفصل‌های واقعی LLM +
      // ترنسکریپت) را از بک‌اند هیدریت می‌کنیم. این هم video_id و هم
      // timeline_items/transcript_lines واقعی را ست می‌کند و باید همیشه اولویت
      // داشته باشد.
      hydrateFromChat(meta);

      // Fallback: فقط برای چت‌های قدیمی/legacy که هنوز هیچ timeline_items واقعی
      // در دیتابیس ندارند (مثلاً قبل از این migration پردازش شده‌اند)، از روی
      // تایم‌استمپ‌های خام داخل متن پیام‌های تاریخی یک تایم‌لاین موقت می‌سازیم.
      // قبلاً این بخش بدون قید و شرط اجرا می‌شد و همیشه دیتای واقعی هیدریت‌شده
      // را با آیتم‌های "From history" (بدون description) overwrite می‌کرد.
      const hasRealTimeline = Array.isArray(meta.timeline_items) && meta.timeline_items.length > 0;
      if (!hasRealTimeline) {
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
      }
    } catch (err) {
      console.error("Error loading chat context:", err);
    } finally {
      setIsLoadingChat(false);
    }
  }, [chatId, setActiveVideoId, setTimelineItems, hydrateFromChat, getToken]);

  useEffect(() => {
    if (!initialVideoUrl) {
      loadChatData();
    }
  }, [chatId, initialVideoUrl, loadChatData]);

  useEffect(() => {
    // 🛡️ متغیر userId فقط برای اطمینان از لاگین بودن چک می‌شود
    if (initialVideoUrl && userId && chatId && !processingTriggered.current) {
      processingTriggered.current = true;
      
      const processVideo = async () => {
        setIsVideoProcessing(true);
        setIsLoadingChat(true);
        try {
          // در اینجا نیازی به اضافه کردن دستی توکن به هدر نیست، چون درخواست
          // به API داخلی Next.js می‌رود و خود Next.js و Clerk متوجه هویت کاربر می‌شوند
          const res = await fetch("/api/process-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              video_url: initialVideoUrl,
              chat_id: chatId,
              // 🛡️ فیلد user_id از اینجا برای همیشه پاک شد!
            }),
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            console.error("Process video error:", data);
            alert(data.error || "خطا در پردازش ویدیو. لطفاً دوباره تلاش کنید.");
            router.push("/chatbot");
            return;
          }

          setActiveVideoId(data.video_id);
          loadChatData();
        } catch (error) {
          console.error("Failed to process video:", error);
          alert("خطای ارتباط با سرور. لطفاً دوباره تلاش کنید.");
          router.push("/chatbot");
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
        // 🛡️ توکن دریافت و به API ارسال می‌شود
        const token = await getToken();
        
        // 🛡️ رفع خطای تایپ‌اسکریپت
        if (!token) {
          console.error("Token is null. User might be logged out.");
          alert("خطا در احراز هویت. لطفاً دوباره وارد حساب کاربری خود شوید.");
          return;
        }

        const data = await sendChatMessage(content, token, chatId, chat?.video_id ?? null);

        const assistantMsg: Message = {
          id: `local-ai-${++messageIdCounter.current}`,
          chat_id: chatId,
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // 🔧 فیکس: قبلاً اینجا از روی تایم‌استمپ‌های خام متن پاسخ، آیتم تازه‌ای به
        // timelineItems (که VideoTimelinePanel/Timeline tab را پر می‌کند) اضافه
        // می‌شد با title: content.slice(0, 50) — یعنی عنوان همان سوال خود کاربر
        // بود، نه موضوع واقعی آن بخش از ویدیو. سرفصل‌های واقعی همین حالا از
        // hydrateFromChat/process-video در timelineItems نشسته‌اند و نباید با
        // ورودی دستیِ نادرست از هر پیام جدید آلوده شوند. منابع مرتبط با همین
        // پاسخ (اگر پاسخ ساختاریافته qa_response باشد) از قبل داخل خود
        // ChatInterface به‌صورت pillهای "Related timestamps" نمایش داده می‌شوند
        // — نیازی به تزریق دستی در تایم‌لاین اصلی نیست.
      } catch (err) {
        console.error(err);
        alert("خطا در ارسال پیام. لطفاً دوباره تلاش کنید.");
      } finally {
        setIsTyping(false);
      }
    },
    [userId, chatId, chat?.video_id, getToken]
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
