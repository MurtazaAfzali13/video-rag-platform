const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function fetchChats(token: string) {
  // 🛡️ تغییر امنیتی: user_id از آدرس حذف شد و توکن در Header قرار گرفت
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
  // 🛡️ تغییر امنیتی: user_id از آدرس حذف شد و توکن اضافه شد
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
  // 🛡️ تغییر امنیتی: user_id از آدرس حذف شد
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
      "Authorization": `Bearer ${token}` // 🛡️ ارسال توکن
    },
    // 🛡️ تغییر امنیتی: user_id از بادی حذف شد
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
      "Authorization": `Bearer ${token}` // 🛡️ ارسال توکن
    },
    body: JSON.stringify({
      query,
      chat_id: chatId,
      video_id: videoId,
      // 🛡️ تغییر امنیتی: فیلد user_id از اینجا کاملاً حذف شد
    }),
  });
  
  if (!res.ok) {
    // گرفتن ارور دقیق از بک‌اند برای نمایش به کاربر (مثل محدودیت پیام‌ها)
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to send message");
  }
  
  return res.json();
}

// ==========================================
// 🆕 SSE Streaming — برای نمایش زنده‌ی گره‌ی درحال‌اجرای LangGraph در فرانت
// ==========================================

/** باید دقیقاً با کلیدهای NODE_LABELS_FA در app/chats.py (بک‌اند) یکی باشد. */
export type PipelineNode =
  | "contextualize"
  | "supervisor"
  | "retriever"
  | "reranker"
  | "validator"
  | "web_search"
  | "generator"
  | "video_summary";

export interface ChatStreamResult {
  response: string;
  chat_id: string;
}

export interface ChatStreamCallbacks {
  /** هر بار که یک گره‌ی جدید از پایپ‌لاین شروع به اجرا می‌کند صدا زده می‌شود. */
  onProgress?: (node: PipelineNode, label: string) => void;
  /** وقتی پاسخ نهایی از بک‌اند می‌رسد (پیش از resolve شدن Promise) صدا زده می‌شود. */
  onFinal?: (result: ChatStreamResult) => void;
}

/**
 * نسخه‌ی استریم‌شده‌ی sendChatMessage. به‌جای یک پاسخ یک‌جا، اندپوینت
 * `/api/chat/stream` بک‌اند را با fetch + ReadableStream می‌خواند و روی هر
 * رویداد SSE (`progress` یا `final` یا `error`) کال‌بک مربوطه را صدا می‌زند.
 *
 * از EventSource استفاده نشده چون EventSource نه POST را پشتیبانی می‌کند
 * و نه هدر Authorization سفارشی را — بنابراین باید دستی با fetch stream بخوانیم.
 */
export async function sendChatMessageStream(
  query: string,
  token: string,
  chatId: string | null,
  videoId: string | null,
  callbacks: ChatStreamCallbacks = {}
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

    // رویدادهای SSE با یک خط خالی ("\n\n") از هم جدا می‌شوند
    const rawEvents = buffer.split("\n\n");
    buffer = rawEvents.pop() || ""; // آخرین تکه ممکن است ناقص باشد، برای دور بعد نگه می‌داریم

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
        continue; // یک chunk ناقص/نامعتبر را نادیده می‌گیریم
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
