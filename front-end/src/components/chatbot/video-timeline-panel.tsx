"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation"; // اضافه شدن روتر
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Play, Clock, FileText, Sparkles, Link, X, Loader2, CheckCircle, AlertCircle, Languages, MessageSquare } from "lucide-react";
import { useVideo } from "@/context/VideoContext";
import { bindVideoToChat } from "@/lib/chat-api";

const parseTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const formatDisplayTime = (timestamp: string): string => {
  return timestamp;
};

export function VideoTimelinePanel({
  chatId,
  userId,
  onVideoBound,
}: {
  chatId?: string;
  userId: string;
  onVideoBound?: (videoId: string) => void;
}) {
  const router = useRouter(); // تعریف روتر برای تغییر آدرس بعد از ساخت چت
  const {
    seekTrigger,
    jumpToTime,
    activeVideoId,
    setActiveVideoId,
    timelineItems,
    transcriptLines,
    activeTimestampId,
    setActiveTimestampId,
    clearTimeline
  } = useVideo();

  const [videoUrl, setVideoUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(activeVideoId);
  const [videoTitle, setVideoTitle] = useState("Add a video to get started");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentVideoId(activeVideoId);
    if (activeVideoId) {
      setVideoTitle((prev) =>
        prev === "Add a video to get started"
          ? `YouTube Video - ${activeVideoId}`
          : prev
      );
    }
  }, [activeVideoId]);

  // گوش دادن به درخواست پرش زمان
  useEffect(() => {
    if (seekTrigger && iframeRef.current) {
      const timeInSeconds = seekTrigger.time;

      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [timeInSeconds, true]
          }),
          '*'
        );
      }

      // هایلایت کردن آیتم مرتبط در تایم‌لاین
      const matchingItem = timelineItems.find(item => {
        const itemSeconds = parseTimestampToSeconds(item.time);
        return Math.abs(itemSeconds - timeInSeconds) < 30;
      });

      if (matchingItem) {
        setActiveTimestampId(matchingItem.id);
      }
    }
  }, [seekTrigger, timelineItems, setActiveTimestampId]);

  const handleExtractVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const videoId = match[1].split('?')[0];
        return videoId;
      }
    }
    return null;
  };

  const handleProcessVideo = async () => {
    if (!videoUrl.trim()) {
      setProcessStatus("error");
      setTimeout(() => setProcessStatus("idle"), 3000);
      return;
    }

    const videoId = handleExtractVideoId(videoUrl);
    if (!videoId) {
      setProcessStatus("error");
      setTimeout(() => setProcessStatus("idle"), 3000);
      return;
    }

    setIsProcessing(true);
    setProcessStatus("loading");

    try {
      // اگر در مسیر /chat/new هستیم، باید null بفرستیم تا بک‌اند چت را بسازد
      const actualChatId = (chatId === "new" || !chatId) ? null : chatId;

      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setVideoTitle(data.title || `YouTube Video - ${videoId}`);

        clearTimeline();

        setTimeout(() => {
          setShowUrlInput(false);
          setVideoUrl("");
          setProcessStatus("idle");
        }, 2000);

        // مهم: اگر بک‌اند یک چت جدید ساخت و آیدی آن با آیدی فعلی (مثلا "new") فرق داشت
        // کاربر را به آدرس جدید (بدون رفرش شدن صفحه) هدایت کن
        if (data.chat_id && data.chat_id !== chatId) {
          router.replace(`/chat/${data.chat_id}`);
        } else if (actualChatId) {
          // اگر از قبل چت وجود داشت، فقط ویدیو را در کلاینت به آن متصل کن
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

  const handleTimelineClick = (item: typeof timelineItems[0]) => {
    setActiveTimestampId(item.id);
    const seconds = parseTimestampToSeconds(item.time);
    jumpToTime(seconds);
  };

  const handleTranscriptClick = (line: typeof transcriptLines[0]) => {
    const seconds = parseTimestampToSeconds(line.time);
    jumpToTime(seconds);
  };

  // نمایش وضعیت لودینگ
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <Loader2 className="size-8 text-purple-400 animate-spin mb-3" />
      <p className="text-slate-400 text-sm">Loading video...</p>
      <p className="text-slate-500 text-xs mt-1">Ask questions to add timestamps</p>
    </div>
  );

  // نمایش حالت خالی
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <Clock className="size-8 text-purple-400/40 mb-3" />
      <p className="text-slate-400 text-sm">No chapters yet</p>
      <p className="text-slate-500 text-xs mt-1">Ask questions about the video to see timestamps here</p>
    </div>
  );

  return (
    <section className="flex w-[40%] min-w-0 flex-col bg-gradient-to-b from-[#08101F] via-[#050816] to-[#050816] border-r border-slate-700/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/5 via-transparent to-transparent pointer-events-none" />

      {/* Video Player Section */}
      <div className="shrink-0 p-5 pb-3">
        <div className="overflow-hidden rounded-2xl border border-slate-700/30 bg-black/50 shadow-2xl shadow-purple-500/10 backdrop-blur-sm">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0C1426] text-center px-6">
                <Languages className="size-8 text-purple-400/50" />
                <p className="text-sm text-slate-400">No video loaded</p>
                <p className="text-xs text-slate-500">
                  Paste a YouTube URL to process and bind it to this chat
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">
              {videoTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="size-3" />
              <span>{timelineItems.length} chapters • {transcriptLines.length} highlights</span>
            </p>
          </div>

          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xs font-medium flex items-center gap-2 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
          >
            <Languages className="size-3.5" />
            New Video
          </button>
        </div>

        {/* URL Input Section */}
        {showUrlInput && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative bg-[#0C1426] rounded-xl border border-slate-700/30 p-3 space-y-3">
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
                  className="p-1 rounded-md hover:bg-slate-700/50 transition-colors"
                >
                  <X className="size-3 text-slate-400" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-[#050816] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProcessVideo();
                  }}
                />
                <button
                  onClick={handleProcessVideo}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processing...
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
                <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Extracting transcript and analyzing video...</span>
                </div>
              )}

              {processStatus === "success" && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 animate-in fade-in">
                  <CheckCircle className="size-3.5" />
                  <span>Video processed successfully! Ask questions to add timestamps.</span>
                </div>
              )}

              {processStatus === "error" && (
                <div className="flex items-center gap-2 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="size-3.5" />
                  <span>Invalid URL. Please check and try again.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Section */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full shrink-0 bg-[#0C1426] border border-slate-700/30 rounded-xl p-1 gap-1">
            <TabsTrigger
              value="timeline"
              className="flex-1 gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Clock className="size-3.5" />
              Timeline ({timelineItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              className="flex-1 gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <FileText className="size-3.5" />
              Highlights ({transcriptLines.length})
            </TabsTrigger>
          </TabsList>

          {/* Timeline Content */}
          <TabsContent value="timeline" className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {timelineItems.length === 0 ? (
              renderEmptyState()
            ) : (
              <ul className="space-y-2 pr-1">
                {timelineItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleTimelineClick(item)}
                      className={cn(
                        "group relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 overflow-hidden",
                        activeTimestampId === item.id
                          ? "border-purple-500/50 bg-purple-600/10 shadow-lg shadow-purple-500/10"
                          : "border-slate-700/30 bg-[#0C1426]/50 hover:border-purple-500/30 hover:bg-purple-600/5"
                      )}
                    >
                      {activeTimestampId === item.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-purple-700" />
                      )}

                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs tabular-nums font-medium transition-colors",
                          activeTimestampId === item.id
                            ? "text-purple-400"
                            : "text-slate-500 group-hover:text-purple-400"
                        )}
                      >
                        {formatDisplayTime(item.time)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <Play className="absolute right-3 size-3 opacity-0 group-hover:opacity-100 transition-all duration-200 text-purple-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* Transcript/Highlights Content */}
          <TabsContent value="transcript" className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {transcriptLines.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="space-y-3 pr-1">
                {transcriptLines.map((line, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleTranscriptClick(line)}
                    className="group flex gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-purple-600/10 cursor-pointer border border-transparent hover:border-purple-500/20"
                  >
                    <span className="shrink-0 font-mono text-xs text-purple-400 tabular-nums font-medium">
                      {formatDisplayTime(line.time)}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-300 group-hover:text-slate-200 transition-colors">
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
          background: #0C1426;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #7C3AED;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8B5CF6;
        }
      `}</style>
    </section>
  );
}