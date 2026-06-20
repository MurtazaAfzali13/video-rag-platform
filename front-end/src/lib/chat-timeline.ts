export interface TimelineEntry {
  timestamp: string;
  title: string;
  description: string;
}

const SOURCES_SPLIT_REGEX =
  /(?:\n\s*(?:\*\*منابع\*\*|\*\*Sources\*\*|منابع|Sources)\s*:?\s*\n?)/i;

const TIMESTAMP_REGEX = /(?:\d{1,2}:)?\d{1,2}:\d{2}/g;
const BRACKET_TIMESTAMP_REGEX = /\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]/g;

const SKIP_LINE_PATTERNS = [
  /^عنوان ویدیو:/i,
  /^video title:/i,
  /^شناسه ویدیو:/i,
  /^video id:/i,
  /^منبع\s+\d+/i,
  /^source\s+\d+/i,
  /^\*\*.*\*\*$/,
];

function normalizeTimestamp(raw: string): string {
  const parts = raw.replace(/[[\]]/g, "").trim().split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (parts.length === 2) {
    return `${Number(parts[0])}:${String(Number(parts[1])).padStart(2, "0")}`;
  }
  return raw;
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return SKIP_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function toTitle(text: string): string {
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/^\-\s*/, "")
    .replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[-–—]?\s*/, "")
    .replace(/\(Video ID:.*?\)/gi, "")
    .replace(/Timestamp:/gi, "")
    .trim();

  if (!cleaned) return "Key Moment";

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  if (firstSentence.length <= 60) return firstSentence;

  const words = firstSentence.split(/\s+/).slice(0, 8).join(" ");
  return words.length < firstSentence.length ? `${words}…` : words;
}

function toDescription(text: string): string {
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/^\-\s*/, "")
    .replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[-–—]?\s*/, "")
    .replace(/\(Video ID:.*?\)/gi, "")
    .replace(/Timestamp:/gi, "")
    .trim();

  if (!cleaned) return "";

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
  return sentences.slice(0, 2).join(" ").trim();
}

export function splitContentAndSources(text: string): {
  main: string;
  sources: string | null;
} {
  const parts = text.split(SOURCES_SPLIT_REGEX);

  if (parts.length > 1) {
    const sources = parts.pop() || "";
    return { main: parts.join("\n").trim(), sources: sources.trim() };
  }

  return { main: text.trim(), sources: null };
}

/** Extract unique timestamps for chat chip buttons only. */
export function extractTimestampChips(text: string): string[] {
  const bracketMatches = [...text.matchAll(BRACKET_TIMESTAMP_REGEX)].map(
    (match) => normalizeTimestamp(match[1])
  );
  const plainMatches = (text.match(TIMESTAMP_REGEX) ?? []).map(normalizeTimestamp);
  return [...new Set([...bracketMatches, ...plainMatches])];
}

function extractTimestampFromLine(line: string): string | null {
  const bracketMatch = line.match(/\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]/);
  if (bracketMatch) return normalizeTimestamp(bracketMatch[1]);

  const timeMatch = line.match(/(?:زمان|time|timestamp)\s*:?\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?/i);
  if (timeMatch) return normalizeTimestamp(timeMatch[1]);

  const plainMatch = line.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
  if (plainMatch) return normalizeTimestamp(plainMatch[1]);

  return null;
}

function extractContentFromBlock(block: string): string {
  const contentMatch = block.match(/(?:محتوا|content)\s*:\s*([\s\S]+)/i);
  if (contentMatch) return contentMatch[1].trim();

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !shouldSkipLine(line));

  const meaningful = lines.filter(
    (line) =>
      !/^(?:زمان|time|timestamp)\s*:/i.test(line) &&
      !/^\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]\s*$/.test(line)
  );

  return meaningful.join(" ").trim();
}

function parseSourceBlocks(sourcesText: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const blocks = sourcesText.split(/\n(?=منبع\s+\d+|source\s+\d+)/i);

  for (const block of blocks) {
    const timestamp = extractTimestampFromLine(block);
    if (!timestamp) continue;

    const content = extractContentFromBlock(block);
    if (!content) continue;

    entries.push({
      timestamp,
      title: toTitle(content),
      description: toDescription(content),
    });
  }

  if (entries.length > 0) return entries;

  const lines = sourcesText.split("\n");
  let pendingContent = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || shouldSkipLine(line)) continue;

    const timestamp = extractTimestampFromLine(line);
    if (timestamp) {
      const inlineContent = line
        .replace(/^\-\s*/, "")
        .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[-–—]?\s*/, "")
        .trim();

      const content = inlineContent || pendingContent;
      pendingContent = "";

      if (content) {
        entries.push({
          timestamp,
          title: toTitle(content),
          description: toDescription(content),
        });
      } else {
        pendingContent = "";
      }
      continue;
    }

    if (/^(?:محتوا|content)\s*:/i.test(line)) {
      pendingContent = line.replace(/^(?:محتوا|content)\s*:\s*/i, "").trim();
    } else if (!shouldSkipLine(line)) {
      pendingContent = pendingContent ? `${pendingContent} ${line}` : line;
    }
  }

  return entries;
}

function findContextNearTimestamp(mainText: string, timestamp: string): string {
  const lines = mainText.split("\n");
  const targetLine = lines.find((line) => line.includes(timestamp));
  if (!targetLine) return "";

  return targetLine
    .replace(/\*\*/g, "")
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
    .replace(/\(Video ID:.*?\)/gi, "")
    .trim();
}

export function parseTimelineFromResponse(
  content: string,
  transcriptLines: Array<{ time: string; text: string }> = []
): TimelineEntry[] {
  const { main, sources } = splitContentAndSources(content);
  const entries = new Map<string, TimelineEntry>();

  if (sources) {
    for (const entry of parseSourceBlocks(sources)) {
      entries.set(entry.timestamp, entry);
    }
  }

  for (const timestamp of extractTimestampChips(sources ?? "")) {
    if (entries.has(timestamp)) continue;

    const context = findContextNearTimestamp(main, timestamp);
    const transcript = transcriptLines.find((line) => line.time === timestamp);

    const contentText = context || transcript?.text || "";
    if (!contentText) continue;

    entries.set(timestamp, {
      timestamp,
      title: toTitle(contentText),
      description: toDescription(contentText),
    });
  }

  return [...entries.values()].sort(
    (a, b) =>
      parseTimestampToSeconds(a.timestamp) - parseTimestampToSeconds(b.timestamp)
  );
}

export function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export interface VideoSummaryTakeaway {
  timestamp: string;
  title: string;
  description: string;
}

export function parseVideoSummaryTakeaways(
  content: string
): VideoSummaryTakeaway[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes("key_takeaways")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      key_takeaways?: Array<{ timestamp: string; point: string }>;
    };

    if (!parsed.key_takeaways?.length) return null;

    return parsed.key_takeaways.map((item) => ({
      timestamp: normalizeTimestamp(item.timestamp),
      title: toTitle(item.point),
      description: toDescription(item.point),
    }));
  } catch {
    return null;
  }
}
