import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

type MessagePart = { type: string; text?: string };
type IncomingMessage = {
  parts?: MessagePart[];
  content?: string;
  role?: string;
};

function getQueryFromMessages(messages: IncomingMessage[]): string {
  const lastMessage = messages?.[messages.length - 1];
  if (!lastMessage) return "";

  if (lastMessage.parts?.length) {
    return lastMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  return (lastMessage.content ?? "").trim();
}

function chunkText(text: string, size = 10): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [""];
}

async function streamResponseText(
  responseText: string,
  originalMessages?: UIMessage[],
  chatId?: string
) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: async ({ writer }) => {
      if (chatId) {
        writer.write({
          type: "data-chat-id",
          data: { chatId },
        });
      }

      const textId = "assistant-response";
      writer.write({ type: "text-start", id: textId });

      const chunks = chunkText(responseText);
      for (const chunk of chunks) {
        writer.write({ type: "text-delta", id: textId, delta: chunk });
        await new Promise((resolve) => setTimeout(resolve, 12));
      }

      writer.write({ type: "text-end", id: textId });
    },
  });

  const response = createUIMessageStreamResponse({ stream });

  if (chatId) {
    response.headers.set("X-Chat-Id", chatId);
  }

  return response;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, user_id, video_id, model, chat_id } = body as {
      messages?: IncomingMessage[];
      user_id?: string;
      video_id?: string | null;
      model?: string;
      chat_id?: string;
    };

    const query = getQueryFromMessages(messages ?? []);

    if (!query) {
      return NextResponse.json(
        { error: "No valid user message content found." },
        { status: 400 }
      );
    }

    if (!chat_id) {
      return NextResponse.json(
        { error: "chat_id is required." },
        { status: 400 }
      );
    }

    const fastApiResponse = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        user_id,
        video_id,
        chat_id,
      }),
    });

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text();
      return NextResponse.json(
        { error: errorText || "Failed to reach FastAPI backend." },
        { status: fastApiResponse.status }
      );
    }

    const data = (await fastApiResponse.json()) as {
      response?: string;
      chat_id?: string;
    };
    const responseText = data.response ?? "";
    const chatId = data.chat_id;

    return streamResponseText(
      responseText,
      messages as UIMessage[] | undefined,
      chatId
    );
  } catch (error) {
    console.error("Chat proxy route error:", error);
    return NextResponse.json(
      { error: "Internal server error in chat proxy." },
      { status: 500 }
    );
  }
}
