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

/*
 * Color tokens (from the reference screenshot)
 * Panel bg        : #060B1E -> #040616
 * Card / tabs bg  : #0A1230   border #1B2757
 * Play circle     : #1E2A6B (idle)  #7C5CF6 (active)
 * Time / accent   : #A78BFA (violet)
 * Active row      : border #7C5CF6, bg #1B1F5E/40
 * Title text      : #EEF1FA   Muted text: #8590B5
 */

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
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#7C5CF6]/10 border border-indigo-400/20">
          <Clock className="size-7 text-violet-300/70" />
        </div>
      </div>
      <p className="text-[#8590B5] text-sm font-medium">No chapters yet</p>
      <p className="text-[#5E688C] text-xs mt-1.5 max-w-[200px]">
        Ask questions about the video to see timestamps here
      </p>
    </div>
  );

  const totalHighlightsCount = timelineItems.length + transcriptLines.length;

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden bg-gradient-to-b from-[#060B1E] to-[#040616] transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-50 h-full w-full"
          : "h-auto md:h-full md:max-h-screen md:min-w-[400px] md:flex-1 md:border-r md:border-[#1B2757]/60"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.12),transparent_45%)]" />

      {/* Video Player */}
      <div className="shrink-0 p-0 md:p-5 md:pb-3 z-10">
        <div className="relative overflow-hidden md:rounded-2xl border-0 md:border border-[#1B2757]/80 bg-black shadow-[0_0_40px_rgba(79,70,229,0.10)] group">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0A1230] text-center px-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#7C5CF6]/10 border border-indigo-400/20">
                    <Youtube className="size-8 text-violet-300/70" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#EEF1FA]">No video loaded</p>
                  <p className="text-xs text-[#8590B5] mt-1">
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
            <h2 className="truncate text-[13px] font-medium text-[#EEF1FA]">{videoTitle}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileTimeline((v) => !v)}
            aria-expanded={showMobileTimeline}
            aria-label="Toggle chapters and highlights"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
              showMobileTimeline
                ? "border-violet-400/60 bg-gradient-to-r from-[#5B4FE9]/35 to-[#7C5CF6]/20 text-violet-200 shadow-[0_0_14px_rgba(124,92,246,0.25)]"
                : "border-[#1B2757] bg-[#0A1230] text-[#B4BCD8]"
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
            <p className="text-xs text-[#8590B5] mt-0.5 flex items-center gap-2">
              <Clock className="size-3" />
              <span>{timelineItems.length} chapters</span>
              <span className="w-1 h-1 rounded-full bg-[#3A4670]" />
              <span>{transcriptLines.length} highlights</span>
            </p>
          </div>
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C5CF6] hover:brightness-110 text-white text-xs font-medium flex items-center gap-2 transition-all duration-200 shadow-[0_0_16px_rgba(99,102,241,0.45)] active:scale-95"
          >
            <Languages className="size-3.5" />
            New Video
          </button>
        </div>

        {showUrlInput && (
          <div className="mt-3 hidden animate-in fade-in slide-in-from-top-2 duration-200 md:block">
            <div className="relative bg-[#0A1230]/80 backdrop-blur-sm rounded-xl border border-[#1B2757] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-violet-300 flex items-center gap-2">
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
                  <X className="size-3.5 text-[#8590B5]" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-[#050816] border border-[#1B2757] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#5E688C] focus:outline-none focus:border-violet-400/60 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProcessVideo();
                  }}
                />
                <button
                  onClick={handleProcessVideo}
                  disabled={isProcessing || isProcessingExt}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-br from-[#5B4FE9] to-[#7C5CF6] hover:brightness-110 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_16px_rgba(99,102,241,0.45)]"
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
            <Tabs
              defaultValue="timeline"
              className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[#1B2757]/70 bg-[#0A1230]/70 px-3 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <TabsList className="h-auto w-full shrink-0 justify-start gap-2 rounded-none border-b border-white/[0.07] bg-transparent p-0">
                <TabsTrigger
                  value="timeline"
                  className="-mb-px gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-[13px] font-medium text-[#8590B5] shadow-none transition-all duration-200 hover:text-slate-200 data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <Clock className="size-3.5" />
                  Timeline
                  <span className="ml-1 text-[10px] bg-white/[0.07] px-1.5 py-0.5 rounded text-[#B4BCD8]">
                    {timelineItems.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="-mb-px gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-[13px] font-medium text-[#8590B5] shadow-none transition-all duration-200 hover:text-slate-200 data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <FileText className="size-3.5" />
                  Highlights
                  <span className="ml-1 text-[10px] bg-white/[0.07] px-1.5 py-0.5 rounded text-[#B4BCD8]">
                    {transcriptLines.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="timeline"
                className="mt-3 min-h-0 flex-1 overflow-y-auto custom-scrollbar focus-visible:outline-none"
              >
                {timelineItems.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <ul className="space-y-1 pr-2 pb-3">
                    {timelineItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleTimelineClick(item)}
                          className={cn(
                            "group w-full flex items-center gap-4 rounded-xl p-3 text-left transition-all duration-200 border",
                            activeTimestampId === item.id
                              ? "border-[#7C5CF6] bg-[#1B1F5E]/40 shadow-[0_0_18px_rgba(124,92,246,0.22)]"
                              : "border-transparent hover:bg-white/[0.035]"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                              activeTimestampId === item.id
                                ? "bg-[#7C5CF6] text-white shadow-[0_0_14px_rgba(124,92,246,0.55)]"
                                : "bg-[#1E2A6B]/80 text-[#A78BFA] group-hover:bg-[#6D4FE8] group-hover:text-white"
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
                                ? "text-[#C4B5FD] font-medium"
                                : "text-[#A78BFA] group-hover:text-[#C4B5FD]"
                            )}
                          >
                            {item.time}
                          </span>

                          <div className="flex-1 min-w-0 pr-2">
                           
                            <h4 className="text-[14px] font-medium text-[#EEF1FA] group-hover:text-white transition-colors line-clamp-1 leading-snug">
                              {item.title}
                            </h4>

                            {item.description && (
                              <p className="text-[13px] text-[#8590B5] mt-1 line-clamp-1 group-hover:text-[#A5AECB] transition-colors">
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
                className="mt-3 min-h-0 flex-1 overflow-y-auto custom-scrollbar focus-visible:outline-none"
              >
                {transcriptLines.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <div className="space-y-2 pr-2 pb-3">
                    {transcriptLines.map((line, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleTranscriptClick(line)}
                        className="group flex gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#1B1F5E]/30 cursor-pointer border border-transparent hover:border-[#7C5CF6]/40"
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Hash className="size-3 text-[#A78BFA]/60" />
                          <span className="font-mono text-xs text-[#A78BFA] tabular-nums font-medium">
                            {line.time}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[#8590B5] group-hover:text-[#EEF1FA] transition-colors">
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
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(167, 139, 250, 0.55);
        }
      `}</style>
    </section>
  );
}

export default VideoTimelinePanel;
