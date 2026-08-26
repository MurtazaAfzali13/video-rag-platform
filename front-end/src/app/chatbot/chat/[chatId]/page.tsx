"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useChatUserId } from "@/hooks/useChatUserId";
import { useVideo } from "@/context/VideoContext";
import {
  fetchChatMeta,
  fetchChatMessages,
  sendChatMessageStream,
  type PipelineNode,
} from "@/lib/chat-api";
import { parseTimestampsFromText, parseTimestampToSeconds } from "@/lib/utils";
import type { Message, Chat } from "@/types";
import VideoTimelinePanel from "@/components/chat/VideoTimelinePanel";
import ChatInterface from "@/components/chat/ChatInterface";


import { useAuth } from "@clerk/nextjs";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const initialVideoUrl = searchParams.get("videoUrl");
  const userId = useChatUserId();
  
  const { getToken } = useAuth();
  
  const { setActiveVideoId, timelineItems, setTimelineItems, hydrateFromChat } = useVideo();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [currentNode, setCurrentNode] = useState<PipelineNode | null>(null);
  
  const messageIdCounter = useRef(0);
  const processingTriggered = useRef(false);

  const loadChatData = useCallback(async () => {
    if (!chatId) return;
    setIsLoadingChat(true);

    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error("احراز هویت نامعتبر است (توکن یافت نشد).");
      }
      
      const [meta, msgs] = await Promise.all([
        fetchChatMeta(chatId, token),
        fetchChatMessages(chatId, token),
      ]);
      
      setChat(meta);
      setMessages(msgs);

      hydrateFromChat(meta);

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
              chat_id: chatId,
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
      setCurrentNode(null); 

      try {
        const token = await getToken();
        
        if (!token) {
          console.error("Token is null. User might be logged out.");
          alert("خطا در احراز هویت. لطفاً دوباره وارد حساب کاربری خود شوید.");
          return;
        }

      
        const data = await sendChatMessageStream(
          content,
          token,
          chatId,
          chat?.video_id ?? null,
          {
            onProgress: (node) => setCurrentNode(node),
          }
        );

        const assistantMsg: Message = {
          id: `local-ai-${++messageIdCounter.current}`,
          chat_id: chatId,
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        try {
          const parsed = JSON.parse(data.response);
          
          if (parsed?.type === "qa_response" && Array.isArray(parsed.sources)) {
            const toMMSS = (sec: number) => {
              const m = Math.floor(sec / 60);
              const s = Math.floor(sec % 60);
              return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
            };

            const newVideoItems = parsed.sources
              .filter((s: any) => s.source_type === "video" && s.video_id === chat?.video_id)
              .map((s: any, i: number) => ({
                id: `qa-${assistantMsg.id}-${i}`,
                time: toMMSS(s.start_time || 0),
                title: s.title || "ارجاع به ویدیو",
                description: s.description || "",
              }));

            if (newVideoItems.length) {
              const existingTimes = new Set(timelineItems.map((t) => t.time));
              const merged = [...timelineItems, ...newVideoItems.filter((t) => !existingTimes.has(t.time))];
              
              setTimelineItems(
                merged.sort((a, b) => parseTimestampToSeconds(a.time) - parseTimestampToSeconds(b.time))
              );
            }
          }
        } catch {
        }

      } catch (err) {
        console.error(err);
        alert("خطا در ارسال پیام. لطفاً دوباره تلاش کنید.");
      } finally {
        setIsTyping(false);
        setCurrentNode(null); 
      }
    },
    [userId, chatId, chat?.video_id, getToken, timelineItems, setTimelineItems]
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
          currentNode={currentNode}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
        />
      </div>
    </div>
  );
}
