import type { CSSProperties, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { detectDirection, type ExportableResponse } from "./response-model";
import { buildVideoUrl, linkifyTimestamps, timestampToSeconds } from "./timestamps";

const C = {
  text: "#1A1F36",
  muted: "#5B6385",
  accent: "#4B3FD8",
  rule: "#E3E6F3",
  card: "#F6F7FF",
  code: "#F1F3FA",
} as const;

const DEFAULT_FONT =
  'var(--font-vazirmatn), "Vazirmatn", "Inter", "Segoe UI", Tahoma, "Noto Sans Arabic", system-ui, sans-serif';

/** ≈ 174mm at 96dpi (A4 width 210mm − 2×18mm margins). Keep in sync with pdf-engine margins. */
const PAGE_CONTENT_WIDTH_PX = 658;

/** Fixed width of the timestamp column so all texts line up (fits H:MM:SS too). */
const TS_COL_WIDTH_PX = 72;

const WRAP: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  whiteSpace: "normal",
};

interface Props {
  response: ExportableResponse;
  title: string;
  /** The user's question that produced this answer (shown only for Q&A answers). */
  question?: string;
  videoUrl?: string;
  generatedAt: Date;
  fontFamily?: string;
}

function Chip({ label, href }: { label: ReactNode; href?: string }) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "1px 8px",
    margin: "0 2px",
    borderRadius: 6,
    background: C.accent,
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: 600,
    lineHeight: "18px",
    textDecoration: "none",
    direction: "ltr",
    unicodeBidi: "isolate",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };
  return href ? (
    <a href={href} style={style}>
      {label}
    </a>
  ) : (
    <span style={style}>{label}</span>
  );
}

function buildMarkdownComponents(videoUrl?: string): Components {
  const heading = (size: number): Components["h1"] =>
    function Heading({ children }) {
      return (
        <h3
          data-pdf-block=""
          data-pdf-keep-next=""
          dir="auto"
          style={{ fontSize: size, fontWeight: 700, margin: "14px 0 6px", lineHeight: 1.4, ...WRAP }}
        >
          {children}
        </h3>
      );
    };

  return {
    p: ({ children }) => (
      <p data-pdf-block="" dir="auto" style={{ margin: "0 0 10px", ...WRAP }}>
        {children}
      </p>
    ),
    h1: heading(18),
    h2: heading(16),
    h3: heading(14.5),
    ul: ({ children }) => (
      <ul dir="auto" style={{ margin: "0 0 10px", paddingInlineStart: 20, listStyle: "disc" }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol dir="auto" style={{ margin: "0 0 10px", paddingInlineStart: 22, listStyle: "decimal" }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li data-pdf-block="" dir="auto" style={{ margin: "0 0 4px", ...WRAP }}>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    blockquote: ({ children }) => (
      <blockquote
        data-pdf-block=""
        dir="auto"
        style={{
          margin: "0 0 10px",
          padding: "4px 12px",
          borderInlineStart: `3px solid ${C.rule}`,
          color: C.muted,
        }}
      >
        {children}
      </blockquote>
    ),
    pre: ({ children }) => (
      <pre
        data-pdf-block=""
        dir="ltr"
        style={{
          margin: "0 0 10px",
          padding: 10,
          background: C.code,
          borderRadius: 6,
          fontSize: 11.5,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        }}
      >
        {children}
      </pre>
    ),
    code: ({ children }) => (
      <code
        style={{
          background: C.code,
          borderRadius: 4,
          padding: "0 4px",
          fontSize: "0.92em",
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        }}
      >
        {children}
      </code>
    ),
    hr: () => <hr style={{ border: 0, borderTop: `1px solid ${C.rule}`, margin: "14px 0" }} />,
    table: ({ children }) => (
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 12px", fontSize: 12 }}>
        {children}
      </table>
    ),
    tr: ({ children }) => <tr data-pdf-block="">{children}</tr>,
    th: ({ children }) => (
      <th
        dir="auto"
        style={{ border: `1px solid ${C.rule}`, background: C.card, padding: "5px 8px", textAlign: "start" }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td dir="auto" style={{ border: `1px solid ${C.rule}`, padding: "5px 8px" }}>
        {children}
      </td>
    ),
    a: ({ href, children }) => {
      if (typeof href === "string" && href.startsWith("#t=")) {
        const seconds = Number(href.slice(3));
        return (
          <Chip
            label={children}
            href={videoUrl && Number.isFinite(seconds) ? buildVideoUrl(videoUrl, seconds) : undefined}
          />
        );
      }
      return (
        <a href={href} style={{ color: C.accent, textDecoration: "underline", wordBreak: "break-word" }}>
          {children}
        </a>
      );
    },
  };
}

export default function PdfDocument({
  response,
  title,
  question,
  videoUrl,
  generatedAt,
  fontFamily = DEFAULT_FONT,
}: Props) {
  const linkFor = (seconds: number | null): string | undefined =>
    videoUrl && seconds !== null ? buildVideoUrl(videoUrl, seconds) : undefined;

  const label = response.kind === "summary" ? "AI Video Summary" : "AI Assistant Answer";
  const showQuestion = response.kind !== "summary" && !!question?.trim();

  return (
    <div
      style={{
        width: PAGE_CONTENT_WIDTH_PX,
        boxSizing: "border-box",
        background: "#ffffff",
        color: C.text,
        fontFamily,
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      <header
        data-pdf-block=""
        style={{ borderBottom: `2px solid ${C.accent}`, paddingBottom: 14, marginBottom: 18 }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: C.accent,
          }}
        >
          {label}
        </div>
        <h1
          dir={detectDirection(title)}
          style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35, margin: "6px 0 8px", ...WRAP }}
        >
          {title}
        </h1>
        <div dir="ltr" style={{ fontSize: 11, color: C.muted, wordBreak: "break-all" }}>
          Generated {generatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          {videoUrl ? ` · ${videoUrl}` : ""}
        </div>
      </header>

      {showQuestion && (
        <div
          data-pdf-block=""
          dir={detectDirection(question ?? "")}
          style={{
            background: C.card,
            border: `1px solid ${C.rule}`,
            borderLeft: `3px solid ${C.accent}`,
            borderRadius: 8,
            padding: "10px 14px",
            margin: "0 0 16px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 4,
            }}
          >
            Question
          </div>
          <div style={{ fontWeight: 600, ...WRAP }}>{question}</div>
        </div>
      )}

      {response.overview && (
        <p
          data-pdf-block=""
          dir={detectDirection(response.overview)}
          style={{ margin: "0 0 14px", fontSize: 13.5, ...WRAP }}
        >
          {response.overview}
        </p>
      )}

      {response.sections
        .flatMap((section) =>
          section.points.map((point, j) => ({
            timestamp: j === 0 ? section.timestamp : null, // chip only on the first point of a group
            point,
          }))
        )
        .map((row, i) => {
          const dir = detectDirection(row.point);
          return (
            <div
              key={i}
              data-pdf-block=""
              dir="ltr"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "3px 0",
              }}
            >
              {/* [timestamp] column: always on the same line as the text */}
              <div
                style={{
                  flex: `0 0 ${TS_COL_WIDTH_PX}px`,
                  width: TS_COL_WIDTH_PX,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {row.timestamp && (
                  <Chip
                    label={row.timestamp}
                    href={linkFor(timestampToSeconds(row.timestamp))}
                  />
                )}
              </div>

              <span
                aria-hidden="true"
                style={{ flex: "0 0 auto", lineHeight: "22px", color: C.accent, fontWeight: 700 }}
              >
                •
              </span>

              <span
                dir={dir}
                style={{
                  flex: 1,
                  minWidth: 0,
                  lineHeight: "22px",
                  textAlign: dir === "rtl" ? "right" : "left",
                  ...WRAP,
                }}
              >
                {row.point}
              </span>
            </div>
          );
        })}

      {response.markdown && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(videoUrl)}>
          {linkifyTimestamps(response.markdown)}
        </ReactMarkdown>
      )}

      {response.sources.length > 0 && (
        <section
          data-pdf-block=""
          style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.rule}` }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 8,
            }}
          >
            Related timestamps
          </div>
          {response.sources.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {s.kind === "video" ? (
                <>
                  <Chip label={s.label} href={linkFor(s.seconds ?? 0)} />
                  {s.title && (
                    <span dir="auto" style={{ color: C.muted, fontSize: 12, ...WRAP }}>
                      {s.title}
                    </span>
                  )}
                </>
              ) : (
                <a
                  href={s.url}
                  dir="ltr"
                  style={{ color: C.accent, fontSize: 12, textDecoration: "underline", wordBreak: "break-all" }}
                >
                  {s.title ? `${s.title} (${s.label})` : s.label}
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      {response.conclusion && (
        <footer
          data-pdf-block=""
          dir={detectDirection(response.conclusion)}
          style={{
            marginTop: 16,
            paddingTop: 10,
            borderTop: `1px solid ${C.rule}`,
            fontSize: 12,
            fontStyle: "italic",
            color: C.muted,
            ...WRAP,
          }}
        >
          {response.conclusion}
        </footer>
      )}
    </div>
  );
}