"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

export interface TranscriptLine {
  time: string;
  text: string;
}

interface SeekTrigger {
  time: number;
  triggeredAt: number;
}

interface VideoContextType {
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  seekTrigger: SeekTrigger | null;
  jumpToTime: (seconds: number) => void;
  timelineItems: TimelineItem[];
  setTimelineItems: (items: TimelineItem[]) => void;
  transcriptLines: TranscriptLine[];
  setTranscriptLines: (lines: TranscriptLine[]) => void;
  activeTimestampId: string | null;
  setActiveTimestampId: (id: string | null) => void;
  clearTimeline: () => void;
}

const VideoContext = createContext<VideoContextType | null>(null);
const STORAGE_KEY = "current_video_timeline";

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [seekTrigger, setSeekTrigger] = useState<SeekTrigger | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [activeTimestampId, setActiveTimestampId] = useState<string | null>(null);

  const jumpToTime = useCallback((seconds: number) => {
    setSeekTrigger({ time: seconds, triggeredAt: Date.now() });
  }, []);

  const clearTimeline = useCallback(() => {
    setTimelineItems([]);
    setTranscriptLines([]);
    setActiveTimestampId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTimeline = localStorage.getItem(STORAGE_KEY);
      if (savedTimeline) {
        try {
          const parsedItems = JSON.parse(savedTimeline);
          if (parsedItems && parsedItems.length > 0) {
            setTimelineItems(parsedItems);
          }
        } catch (e) {
          console.error("Failed to parse timeline from localstorage", e);
        }
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (timelineItems.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timelineItems));
      }
    }
  }, [timelineItems]);
  return (
    <VideoContext.Provider
      value={{
        activeVideoId,
        setActiveVideoId,
        seekTrigger,
        jumpToTime,
        timelineItems,
        setTimelineItems,
        transcriptLines,
        setTranscriptLines,
        activeTimestampId,
        setActiveTimestampId,
        clearTimeline,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo(): VideoContextType {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideo must be used within VideoProvider");
  return ctx;
}
