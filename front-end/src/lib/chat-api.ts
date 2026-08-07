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