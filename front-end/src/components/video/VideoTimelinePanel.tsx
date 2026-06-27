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
    transcriptLines,
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
        clearTimeline();

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
  };

  const handleTranscriptClick = (line: (typeof transcriptLines)[0]) => {
    const seconds = parseTimestampToSeconds(line.time);
    jumpToTime(seconds);
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

  return (
    <section 
      className={cn(
        "relative flex flex-col bg-gradient-to-b from-[#0B0F19] via-[#090D17] to-[#070B14] border-r border-white/[0.06] transition-all duration-300 h-full max-h-screen overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50 w-full h-full" : "flex-1 min-w-[400px]"
      )}
    >
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-purple-600/6 via-transparent to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-purple-600/10 blur-[80px]" />

      {/* Video Player (Fixed Area) */}
      <div className="shrink-0 p-5 pb-3 z-10">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 shadow-2xl shadow-purple-500/5 backdrop-blur-sm group">
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

          {/* Gradient overlay on video */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          
          {/* Fullscreen button */}
          {currentVideoId && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white hover:bg-black/70 transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          )}
        </div>

        {/* Video Meta */}
        <div className="mt-4 flex items-start justify-between gap-3">
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

        {/* URL Input Panel */}
        {showUrlInput && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
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

              {processStatus === "loading" && (
                <div className="flex items-center gap-2.5 text-xs text-purple-400 animate-pulse">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Extracting transcript and analyzing video…</span>
                </div>
              )}
              {processStatus === "success" && (
                <div className="flex items-center gap-2.5 text-xs text-emerald-400 animate-in fade-in">
                  <CheckCircle className="size-3.5" />
                  <span>Video processed successfully! Ask questions to generate timestamps.</span>
                </div>
              )}
              {processStatus === "error" && (
                <div className="flex items-center gap-2.5 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="size-3.5" />
                  <span>Invalid URL. Please check and try again.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Layout Container (Scrollable Area) */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 overflow-hidden">
        <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 gap-1">
            <TabsTrigger
              value="timeline"
              className="flex-1 gap-2 text-xs font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-lg transition-all duration-200 text-slate-400 hover:text-slate-200"
            >
              <Clock className="size-3.5" />
              Timeline
              <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                {timelineItems.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              className="flex-1 gap-2 text-xs font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-lg transition-all duration-200 text-slate-400 hover:text-slate-200"
            >
              <FileText className="size-3.5" />
              Highlights
              <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                {transcriptLines.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Timeline Content List */}
          <TabsContent
            value="timeline"
            className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar focus-visible:outline-none"
          >
            {timelineItems.length === 0 ? (
              renderEmptyState()
            ) : (
              <ul className="space-y-3 pr-1 pb-4">
                {timelineItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleTimelineClick(item)}
                      className={cn(
                        "group relative flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all duration-200 overflow-hidden border",
                        activeTimestampId === item.id
                          ? "border-purple-500/50 bg-purple-600/10 shadow-lg shadow-purple-500/5"
                          : "border-transparent hover:bg-white/[0.02]"
                      )}
                    >
                      {/* Left Side: Circular Video Logo Container */}
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                          activeTimestampId === item.id
                            ? "bg-purple-600 text-white"
                            : "bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white"
                        )}
                      >
                        <Play className={cn("size-3.5 fill-current ml-0.5 transition-transform", activeTimestampId === item.id ? "scale-110" : "group-hover:scale-110")} />
                      </div>

                      {/* Middle Side: Precise Timestamp */}
                      <span
                        className={cn(
                          "font-mono text-sm tabular-nums font-semibold shrink-0 min-w-[45px] transition-colors",
                          activeTimestampId === item.id
                            ? "text-purple-400"
                            : "text-purple-400/70 group-hover:text-purple-400"
                        )}
                      >
                        {item.time}
                      </span>

                      {/* Right Side: Chapter Title & Description */}
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 group-hover:text-slate-400 transition-colors">
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

          {/* Transcript Content List */}
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
                      <Hash className="size-3 text-purple-400/50" />
                      <span className="font-mono text-xs text-purple-400 tabular-nums font-semibold">
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