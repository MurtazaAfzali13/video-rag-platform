// src/context/VideoContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

// تایپ برای آیتم تایم‌لاین
export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

// تایپ برای خط ترنسکریپت
export interface TranscriptLine {
  time: string;
  text: string;
}

interface VideoContextType {
  activeVideoId: string;
  setActiveVideoId: (id: string) => void;
  seekTrigger: { time: number; serial: number } | null;
  jumpToTime: (seconds: number) => void;
  // داده‌های تایم‌لاین
  timelineItems: TimelineItem[];
  transcriptLines: TranscriptLine[];
  addTimelineItem: (time: string, title: string, description?: string) => void;
  addTranscriptLine: (time: string, text: string) => void;
  clearTimeline: () => void;
  activeTimestampId: string | null;
  setActiveTimestampId: (id: string | null) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [activeVideoId, setActiveVideoId] = useState("aywZrzNaKjs");
  const [seekTrigger, setSeekTrigger] = useState<{ time: number; serial: number } | null>(null);
  
  // داده‌های تایم‌لاین
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [activeTimestampId, setActiveTimestampId] = useState<string | null>(null);

  const jumpToTime = useCallback((seconds: number) => {
    setSeekTrigger({ time: seconds, serial: Date.now() });
  }, []);

  const addTimelineItem = useCallback((time: string, title: string, description?: string) => {
    const newItem: TimelineItem = {
      id: Date.now().toString(),
      time,
      title,
      description,
    };
    setTimelineItems(prev => {
      // بررسی نکنیم که قبلاً وجود دارد یا نه
      return [...prev, newItem];
    });
  }, []);

  const addTranscriptLine = useCallback((time: string, text: string) => {
    setTranscriptLines(prev => {
      // بررسی نکنیم که تکراری نباشد
      const exists = prev.some(line => line.time === time && line.text === text);
      if (exists) return prev;
      return [...prev, { time, text }];
    });
  }, []);

  const clearTimeline = useCallback(() => {
    setTimelineItems([]);
    setTranscriptLines([]);
    setActiveTimestampId(null);
  }, []);

  return (
    <VideoContext.Provider value={{
      activeVideoId,
      setActiveVideoId,
      seekTrigger,
      jumpToTime,
      timelineItems,
      transcriptLines,
      addTimelineItem,
      addTranscriptLine,
      clearTimeline,
      activeTimestampId,
      setActiveTimestampId,
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) throw new Error("useVideo must be used within a VideoProvider");
  return context;
}