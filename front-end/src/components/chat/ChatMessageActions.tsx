"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, FileDown, Loader2 } from "lucide-react";
import { copyToClipboard } from "./export/clipboard";
import { buildPdfFileName, parseAssistantContent, toPlainText } from "./export/response-model";

interface Props {
    content: string;
    documentTitle?: string;
    question?: string;
    videoUrl?: string;
}

type CopyState = "idle" | "copied" | "error";
type ExportState = "idle" | "generating" | "done" | "error";

const BTN =
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[#7F89AD] transition-all duration-200 " +
    "hover:bg-white/[0.06] hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-indigo-400/50 disabled:cursor-wait disabled:opacity-70";

function useTransientState<T>(initial: T) {
    const [value, setValue] = useState<T>(initial);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const set = useCallback(
        (next: T, resetAfterMs?: number) => {
            clearTimeout(timer.current);
            setValue(next);
            if (resetAfterMs) {
                timer.current = setTimeout(() => setValue(initial), resetAfterMs);
            }
        },
        [initial]
    );

    return [value, set] as const;
}

const ChatMessageActions = memo(function ChatMessageActions({
    content,
    documentTitle,
    question,
    videoUrl,
}: Props) {
    const [copyState, setCopyState] = useTransientState<CopyState>("idle");
    const [exportState, setExportState] = useTransientState<ExportState>("idle");

    const handleCopy = useCallback(async () => {
        const ok = await copyToClipboard(toPlainText(parseAssistantContent(content)));
        setCopyState(ok ? "copied" : "error", 2000);
    }, [content, setCopyState]);

    const handleExport = useCallback(async () => {
        if (exportState === "generating") return;
        setExportState("generating");
        try {
            const response = parseAssistantContent(content);
            const title =
                documentTitle?.trim() || (response.kind === "summary" ? "Video Summary" : "Video Q&A");
            const { exportResponseToPdf } = await import("./export/export-pdf");
            await exportResponseToPdf({
                response,
                title,
                question,
                videoUrl,
                fileName: buildPdfFileName(title),
            });
            setExportState("done", 2000);
        } catch (error) {
            console.error("PDF export failed:", error);
            setExportState("error", 3500);
        }
    }, [content, documentTitle, question, videoUrl, exportState, setExportState]);

    const copyLabel =
        copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy Text";

    const exportLabel =
        exportState === "generating"
            ? "Generating…"
            : exportState === "done"
                ? "Saved!"
                : exportState === "error"
                    ? "Export failed"
                    : "Export PDF";

    return (
        <>
            <button type="button" onClick={handleCopy} className={BTN} title="Copy response as text">
                {copyState === "copied" ? (
                    <Check className="size-3.5 text-emerald-400" />
                ) : copyState === "error" ? (
                    <AlertCircle className="size-3.5 text-red-400" />
                ) : (
                    <Copy className="size-3.5" />
                )}
                <span className={copyState === "idle" ? "hidden sm:inline" : "inline"}>{copyLabel}</span>
            </button>

            <button
                type="button"
                onClick={handleExport}
                disabled={exportState === "generating"}
                aria-busy={exportState === "generating"}
                className={BTN}
                title="Download response as PDF"
            >
                {exportState === "generating" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                ) : exportState === "done" ? (
                    <Check className="size-3.5 text-emerald-400" />
                ) : exportState === "error" ? (
                    <AlertCircle className="size-3.5 text-red-400" />
                ) : (
                    <FileDown className="size-3.5" />
                )}
                <span className={exportState === "idle" ? "hidden sm:inline" : "inline"}>
                    {exportLabel}
                </span>
            </button>

            <span className="sr-only" role="status" aria-live="polite">
                {copyState === "copied"
                    ? "Copied to clipboard"
                    : exportState === "generating"
                        ? "Generating PDF"
                        : ""}
            </span>
        </>
    );
});

export default ChatMessageActions;