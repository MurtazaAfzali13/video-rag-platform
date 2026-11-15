import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import PdfDocument from "./PdfDocument";
import type { ExportableResponse } from "./response-model";
import { renderElementToPdf } from "./pdf-engine";

export interface ExportResponseToPdfOptions {
    response: ExportableResponse;
    title: string;
    question?: string;
    fileName: string;
    videoUrl?: string;
}

async function waitForLayout(): Promise<void> {
    await document.fonts?.ready;
    await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
}

export async function exportResponseToPdf({
    response,
    title,
    question,
    fileName,
    videoUrl,
}: ExportResponseToPdfOptions): Promise<void> {
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;top:0;left:-10000px;pointer-events:none;";
    document.body.appendChild(host);

    const root = createRoot(host);
    try {
        flushSync(() =>
            root.render(
                <PdfDocument
                    response={response}
                    title={title}
                    question={question}
                    videoUrl={videoUrl}
                    generatedAt={new Date()}
                />
            )
        );
        await waitForLayout();

        const element = host.firstElementChild;
        if (!(element instanceof HTMLElement)) throw new Error("PDF template failed to render");

        await renderElementToPdf(element, { title, fileName });
    } finally {
        root.unmount();
        host.remove();
    }
}