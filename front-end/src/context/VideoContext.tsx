"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

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

interface VideoContextType {
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  seekTrigger: { time: number; serial: number } | null;
  jumpToTime: (seconds: number) => void;
  timelineItems: TimelineItem[];
  transcriptLines: TranscriptLine[];
  addTimelineItem: (time: string, title: string, description?: string) => void;
  addTranscriptLine: (time: string, text: string) => void;
  clearTimeline: () => void;
  activeTimestampId: string | null;
  setActiveTimestampId: (id: string | null) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({
  children,
  initialVideoId = null,
}: {
  children: ReactNode;
  initialVideoId?: string | null;
}) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(initialVideoId);
  const [seekTrigger, setSeekTrigger] = useState<{ time: number; serial: number } | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [activeTimestampId, setActiveTimestampId] = useState<string | null>(null);

  useEffect(() => {
    setActiveVideoId(initialVideoId ?? null);
  }, [initialVideoId]);

  const jumpToTime = useCallback((seconds: number) => {
    setSeekTrigger({ time: seconds, serial: Date.now() });
  }, []);

  const addTimelineItem = useCallback((time: string, title: string, description?: string) => {
    setTimelineItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.time === time);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          title,
          description: description ?? updated[existingIndex].description,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: `${time}-${Date.now()}`,
          time,
          title,
          description,
        },
      ];
    });
  }, []);

  const addTranscriptLine = useCallback((time: string, text: string) => {
    setTranscriptLines((prev) => {
      const exists = prev.some((line) => line.time === time && line.text === text);
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
    <VideoContext.Provider
      value={{
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
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) throw new Error("useVideo must be used within a VideoProvider");
  return context;
}
