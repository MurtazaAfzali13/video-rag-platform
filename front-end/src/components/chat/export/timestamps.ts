export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "01:23" | "1:02:03" | "00:25-01:22" (start of range) -> seconds, or null. */
export function timestampToSeconds(label: string): number | null {
  const m = /(\d{1,3}):(\d{2})(?::(\d{2}))?/.exec(label);
  if (!m) return null;
  return m[3] !== undefined
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number(m[1]) * 60 + Number(m[2]);
}

export function buildVideoUrl(base: string, seconds: number): string {
  try {
    const url = new URL(base);
    url.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`);
    return url.toString();
  } catch {
    return base;
  }
}

/** "[MM:SS]" -> "[MM:SS](#t=<seconds>)" (code spans/fences untouched). */
export function linkifyTimestamps(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(
            /\[(\d{1,3}):(\d{2})(?::(\d{2}))?\](?!\()/g,
            (_m, a: string, b: string, c?: string) => {
              const secs = c !== undefined ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
              const label = c !== undefined ? `${a}:${b}:${c}` : `${a}:${b}`;
              return `[${label}](#t=${secs})`;
            }
          )
    )
    .join("");
}