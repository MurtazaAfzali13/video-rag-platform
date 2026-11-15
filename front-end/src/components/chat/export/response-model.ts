import { formatTimestamp } from "./timestamps";

export interface ExportSection {
  timestamp: string | null;
  points: string[];
}

export interface ExportSource {
  kind: "video" | "web";
  label: string;
  seconds?: number;
  title?: string;
  url?: string;
}

export interface ExportableResponse {
  kind: "summary" | "qa" | "text";
  overview: string | null;
  sections: ExportSection[];
  markdown: string | null;
  sources: ExportSource[];
  conclusion: string | null;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is JsonRecord =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function tryParseJson(content: string): JsonRecord | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web source";
  }
}

/** First strong letter decides direction (Persian/Arabic/Hebrew -> rtl). */
export function detectDirection(text: string): "rtl" | "ltr" {
  const m = /[A-Za-z\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.exec(text);
  return m && /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(m[0]) ? "rtl" : "ltr";
}

export function parseAssistantContent(content: string): ExportableResponse {
  const json = tryParseJson(content);

  if (json && (json.type === "video_summary" || Array.isArray(json.key_takeaways))) {
    const groups = new Map<string, string[]>();
    for (const item of asArray(json.key_takeaways)) {
      if (!isRecord(item)) continue;
      const point = asString(item.point);
      if (!point) continue;
      const ts = asString(item.timestamp).replace(/^\[|\]$/g, "");
      const list = groups.get(ts) ?? [];
      list.push(point);
      groups.set(ts, list);
    }
    return {
      kind: "summary",
      overview: asString(json.overall_summary) || null,
      sections: [...groups].map(([ts, points]) => ({ timestamp: ts || null, points })),
      markdown: null,
      sources: [],
      conclusion: asString(json.academic_conclusion) || null,
    };
  }

  if (json && json.type === "qa_response") {
    const sources: ExportSource[] = [];
    for (const s of asArray(json.sources)) {
      if (!isRecord(s)) continue;
      if (s.source_type === "video") {
        const seconds = Number(s.start_time) || 0;
        sources.push({
          kind: "video",
          seconds,
          label: formatTimestamp(seconds),
          title: asString(s.title) || undefined,
        });
      } else {
        const url = asString(s.url);
        sources.push({
          kind: "web",
          url: url || undefined,
          label: hostname(url),
          title: asString(s.title) || undefined,
        });
      }
    }
    return {
      kind: "qa",
      overview: null,
      sections: [],
      markdown: asString(json.answer) || null,
      sources,
      conclusion: null,
    };
  }

  return {
    kind: "text",
    overview: null,
    sections: [],
    markdown: content.trim() || null,
    sources: [],
    conclusion: null,
  };
}

function sourceLine(s: ExportSource): string {
  if (s.kind === "video") return `- [${s.label}]${s.title ? ` ${s.title}` : ""}`;
  return `- ${s.title ? `${s.title} — ` : ""}${s.url ?? s.label}`;
}

/** Clean plain text: timestamps and line breaks preserved. */
export function toPlainText(r: ExportableResponse): string {
  const blocks: string[] = [];
  if (r.overview) blocks.push(r.overview);

  if (r.sections.length) {
    const lines: string[] = [];
    for (const s of r.sections) {
      const prefix = s.timestamp ? `[${s.timestamp}] ` : "";
      const pad = " ".repeat(prefix.length);
      s.points.forEach((p, i) => lines.push(`${i === 0 ? prefix : pad}• ${p}`));
    }
    blocks.push(lines.join("\n"));
  }

  if (r.markdown) blocks.push(r.markdown);
  if (r.sources.length) {
    blocks.push(["Related timestamps:", ...r.sources.map(sourceLine)].join("\n"));
  }
  if (r.conclusion) blocks.push(r.conclusion);

  return blocks
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPdfFileName(title: string, date = new Date()): string {
  const slug = title
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `${slug || "video-summary"}-${stamp}.pdf`;
}