"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Clock,
  FileText,
  Sparkles,
  Link,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Languages,
  Youtube,
  Hash,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react";
import { useVideo } from "@/context/VideoContext";
import { bindVideoToChat } from "@/lib/chat-api";
import { extractYouTubeId, parseTimestampToSeconds, cn } from "@/lib/utils";

export function VideoTimelinePanel({
  chatId,
  userId,
  onVideoBound,
  isProcessingExt = false,
}: {
  chatId?: string;
  userId: string;
  onVideoBound?: (videoId: string) => void;
  isProcessingExt?: boolean;
}) {
  const router = useRouter();
  const {
    seekTrigger,
    jumpToTime,
    activeVideoId,
    setActiveVideoId,
    timelineItems,
    setTimelineItems,
    transcriptLines,
    setTranscriptLines,
    activeTimestampId,
    setActiveTimestampId,
    clearTimeline,
  } = useVideo();

  const [videoUrl, setVideoUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(activeVideoId);
  const [videoTitle, setVideoTitle] = useState("Add a video to get started");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileTimeline, setShowMobileTimeline] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentVideoId(activeVideoId);
    if (activeVideoId) {
      setVideoTitle((prev) =>
        prev === "Add a video to get started"
          ? `YouTube Video — ${activeVideoId}`
          : prev
      );
    }
  }, [activeVideoId]);

  useEffect(() => {
    if (seekTrigger && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seekTrigger.time, true],
        }),
        "*"
      );
      const matchingItem = timelineItems.find((item) => {
        const itemSec = parseTimestampToSeconds(item.time);
        return Math.abs(itemSec - seekTrigger.time) < 30;
      });
      if (matchingItem) setActiveTimestampId(matchingItem.id);
    }
  }, [seekTrigger, timelineItems, setActiveTimestampId]);

  const handleProcessVideo = async () => {
    if (!videoUrl.trim()) {
      setProcessStatus("error");
      setTimeout(() => setProcessStatus("idle"), 3000);
      return;
    }

    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      setProcessStatus("error");
      setTimeout(() => setProcessStatus("idle"), 3000);
      return;
    }

    setIsProcessing(true);
    setProcessStatus("loading");
    clearTimeline();

    try {
      const actualChatId = !chatId || chatId === "new" ? null : chatId;

      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl,
          user_id: userId,
          chat_id: actualChatId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setProcessStatus("success");
        setCurrentVideoId(videoId);
        setActiveVideoId(videoId);
        onVideoBound?.(videoId);
        setVideoTitle(data.title || `YouTube Video — ${videoId}`);

        if (data.timeline_items) {
          setTimelineItems(data.timeline_items);
        }
        if (data.transcript_lines) {
          setTranscriptLines(data.transcript_lines);
        }
     

        setTimeout(() => {
          setShowUrlInput(false);
          setVideoUrl("");
          setProcessStatus("idle");
        }, 2000);

        if (data.chat_id && data.chat_id !== chatId) {
          router.replace(`/chatbot/chat/${data.chat_id}`);
        } else if (actualChatId) {
          await bindVideoToChat(actualChatId, userId, videoId);
        }
      } else {
        setProcessStatus("error");
        setTimeout(() => setProcessStatus("idle"), 3000);
      }
    } catch (error) {
      console.error("Error processing video:", error);
      setProcessStatus("error");
      setTimeout(() => setProcessStatus("idle"), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimelineClick = (item: (typeof timelineItems)[0]) => {
    setActiveTimestampId(item.id);
    const seconds = parseTimestampToSeconds(item.time);
    jumpToTime(seconds);
   
    setShowMobileTimeline(false);
  };

  const handleTranscriptClick = (line: (typeof transcriptLines)[0]) => {
    const seconds = parseTimestampToSeconds(line.time);
    jumpToTime(seconds);
    setShowMobileTimeline(false);
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-2xl" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/20">
          <Clock className="size-7 text-purple-400/60" />
        </div>
      </div>
      <p className="text-slate-400 text-sm font-medium">No chapters yet</p>
      <p className="text-slate-500 text-xs mt-1.5 max-w-[200px]">
        Ask questions about the video to see timestamps here
      </p>
    </div>
  );

  const totalHighlightsCount = timelineItems.length + transcriptLines.length;

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden bg-[#0A0D18] transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-50 h-full w-full"
          : "h-auto md:h-full md:max-h-screen md:min-w-[400px] md:flex-1 md:border-r md:border-white/[0.06]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-purple-600/5 via-transparent to-transparent" />

      {/* Video Player */}
      <div className="shrink-0 p-0 md:p-5 md:pb-3 z-10">
        <div className="relative overflow-hidden md:rounded-2xl border-0 md:border border-white/[0.08] bg-black/60 shadow-2xl shadow-purple-500/5 group">
          <div className="relative aspect-video w-full">
            {currentVideoId ? (
              <iframe
                key={currentVideoId}
                ref={iframeRef}
                className="absolute inset-0 size-full"
                src={`https://www.youtube.com/embed/${currentVideoId}?rel=0&modestbranding=1&enablejsapi=1`}
                title={videoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0C1426] text-center px-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-2xl" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/20">
                    <Youtube className="size-8 text-purple-400/60" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">No video loaded</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste a YouTube URL to start analyzing
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {currentVideoId && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white hover:bg-black/70 transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          )}
        </div>

       
        <div className="mt-3 flex items-center justify-between gap-2 px-4 md:hidden">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[13px] font-medium text-slate-300">{videoTitle}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileTimeline((v) => !v)}
            aria-expanded={showMobileTimeline}
            aria-label="Toggle chapters and highlights"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
              showMobileTimeline
                ? "border-purple-500/60 bg-gradient-to-r from-purple-600/30 to-purple-700/20 text-purple-200 shadow-sm shadow-purple-500/20"
                : "border-white/10 bg-white/5 text-slate-300"
            )}
          >
            <Clock className="size-3.5" />
            {totalHighlightsCount > 0 && (
              <span className="tabular-nums">{totalHighlightsCount}</span>
            )}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-300",
                showMobileTimeline && "rotate-180"
              )}
            />
          </button>
        </div>

        <div className="mt-4 hidden items-start justify-between gap-3 md:flex">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white truncate tracking-tight">
              {videoTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <Clock className="size-3" />
              <span>{timelineItems.length} chapters</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span>{transcriptLines.length} highlights</span>
            </p>
          </div>
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xs font-medium flex items-center gap-2 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-95"
          >
            <Languages className="size-3.5" />
            New Video
          </button>
        </div>

        {showUrlInput && (
          <div className="mt-3 hidden animate-in fade-in slide-in-from-top-2 duration-200 md:block">
            <div className="relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-purple-400 flex items-center gap-2">
                  <Link className="size-3" />
                  YouTube Video URL
                </label>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setVideoUrl("");
                    setProcessStatus("idle");
                  }}
                  className="p-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="size-3.5 text-slate-400" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-[#050816] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProcessVideo();
                  }}
                />
                <button
                  onClick={handleProcessVideo}
                  disabled={isProcessing || isProcessingExt}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  {(isProcessing || isProcessingExt) ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Process
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

     
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out md:!grid-rows-[1fr] md:!opacity-100 md:flex-1 md:min-h-0",
          showMobileTimeline ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden md:flex md:flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5 pt-1 md:pt-0">
            <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="w-full shrink-0 bg-[#121626]/60 border border-white/5 rounded-xl p-1 gap-1">
                <TabsTrigger
                  value="timeline"
                  className="flex-1 gap-2 text-xs font-medium data-[state=active]:bg-purple-600/90 data-[state=active]:text-white rounded-lg transition-all duration-200 text-slate-400 hover:text-slate-200"
                >
                  <Clock className="size-3.5" />
                  Timeline
                  <span className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-white">
                    {timelineItems.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="flex-1 gap-2 text-xs font-medium data-[state=active]:bg-purple-600/90 data-[state=active]:text-white rounded-lg transition-all duration-200 text-slate-400 hover:text-slate-200"
                >
                  <FileText className="size-3.5" />
                  Highlights
                  <span className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-white">
                    {transcriptLines.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="timeline"
                className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar focus-visible:outline-none"
              >
                {timelineItems.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <ul className="space-y-1.5 pr-1 pb-4">
                    {timelineItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleTimelineClick(item)}
                          className={cn(
                            "group w-full flex items-center gap-4 rounded-xl p-3.5 text-left transition-all duration-200 border",
                            activeTimestampId === item.id
                              ? "border-purple-600/70 bg-[#251e3f]/40 shadow-sm"
                              : "border-transparent hover:bg-white/[0.03]"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                              activeTimestampId === item.id
                                ? "bg-[#8b5cf6] text-white shadow-md shadow-purple-600/20"
                                : "bg-[#181a36] text-[#9333ea] group-hover:bg-[#8b5cf6] group-hover:text-white"
                            )}
                          >
                            <Play className={cn(
                              "size-3.5 fill-current ml-0.5 transition-transform",
                              activeTimestampId === item.id ? "scale-110" : "group-hover:scale-110"
                            )} />
                          </div>

                          <span
                            className={cn(
                              "font-mono text-[15px] tabular-nums tracking-wide shrink-0 min-w-[45px] transition-colors",
                              activeTimestampId === item.id
                                ? "text-[#a78bfa] font-medium"
                                : "text-[#8b5cf6] group-hover:text-[#a78bfa]"
                            )}
                          >
                            {item.time}
                          </span>

                          <div className="flex-1 min-w-0 pr-2">
                           
                            <h4 className="text-[14px] font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-1 leading-snug">
                              {item.title}
                            </h4>

                            {item.description && (
                              <p className="text-[13px] text-slate-500 mt-1 line-clamp-1 group-hover:text-slate-400 transition-colors">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent
                value="transcript"
                className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar focus-visible:outline-none"
              >
                {transcriptLines.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <div className="space-y-2 pr-1 pb-4">
                    {transcriptLines.map((line, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleTranscriptClick(line)}
                        className="group flex gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-purple-600/10 cursor-pointer border border-transparent hover:border-purple-500/20"
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Hash className="size-3 text-[#8b5cf6]/60" />
                          <span className="font-mono text-xs text-[#8b5cf6] tabular-nums font-medium">
                            {line.time}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-200 transition-colors">
                          {line.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.45);
        }
      `}</style>
    </section>
  );
}

export default VideoTimelinePanel;
