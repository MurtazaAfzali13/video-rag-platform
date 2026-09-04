const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function fetchChats(token: string) {
  const res = await fetch(`${BASE}/api/chats?limit=50`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

export async function fetchChatMessages(chatId: string, token: string) {
  const res = await fetch(
    `${BASE}/api/chats/${chatId}/messages?limit=200`, 
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    }
  );
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function fetchChatMeta(chatId: string, token: string) {
  const res = await fetch(
    `${BASE}/api/chats/${chatId}`, 
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    }
  );
  if (!res.ok) throw new Error("Failed to fetch chat");
  return res.json();
}

export async function bindVideoToChat(
  chatId: string,
  token: string,
  videoId: string
) {
  const res = await fetch(`${BASE}/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!res.ok) throw new Error("Failed to bind video");
  return res.json();
}

export async function sendChatMessage(
  query: string,
  token: string, 
  chatId: string | null,
  videoId: string | null
) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify({
      query,
      chat_id: chatId,
      video_id: videoId,
    }),
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to send message");
  }
  
  return res.json();
}
export type PipelineNode =
  | "contextualize"
  | "supervisor"
  | "retriever"
  | "reranker"
  | "validator"
  | "web_search"
  | "generator"
  | "video_summary";

export type SearchScope = "single_video" | "general";

export interface ChatStreamResult {
  response: string;
  chat_id: string;
}

export interface ChatStreamCallbacks {
  onProgress?: (node: PipelineNode, label: string) => void;
  onFinal?: (result: ChatStreamResult) => void;
}

export async function sendChatMessageStream(
  query: string,
  token: string,
  chatId: string | null,
  videoId: string | null,
  callbacks: ChatStreamCallbacks = {},
  searchScope?: SearchScope
): Promise<ChatStreamResult> {
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      chat_id: chatId,
      video_id: videoId,
      ...(searchScope ? { search_scope: searchScope } : {}),
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to start chat stream");
  }

  if (!res.body) {
    throw new Error("Streaming is not supported by this response.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ChatStreamResult | null = null;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const rawEvents = buffer.split("\n\n");
    buffer = rawEvents.pop() || ""; 

    for (const rawEvent of rawEvents) {
      if (!rawEvent.trim()) continue;

      let eventName = "message";
      let dataLine = "";

      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLine = line.slice(5).trim();
        }
      }

      if (!dataLine) continue;

      let parsed: any;
      try {
        parsed = JSON.parse(dataLine);
      } catch {
        continue; 
      }

      if (eventName === "progress") {
        callbacks.onProgress?.(parsed.node as PipelineNode, parsed.label);
      } else if (eventName === "final") {
        finalResult = { response: parsed.response, chat_id: parsed.chat_id };
        callbacks.onFinal?.(finalResult);
      } else if (eventName === "error") {
        streamError = parsed.detail || "خطا در جریان پاسخ";
      }
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }
  if (!finalResult) {
    throw new Error("پاسخی از سرور دریافت نشد.");
  }

  return finalResult;
}
