const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function fetchChats(userId: string) {
  const res = await fetch(`${BASE}/api/chats?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

export async function fetchChatMessages(chatId: string, userId: string) {
  const res = await fetch(
    `${BASE}/api/chats/${chatId}/messages?user_id=${encodeURIComponent(userId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function fetchChatMeta(chatId: string, userId: string) {
  const res = await fetch(
    `${BASE}/api/chats/${chatId}?user_id=${encodeURIComponent(userId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch chat");
  return res.json();
}

export async function bindVideoToChat(
  chatId: string,
  userId: string,
  videoId: string
) {
  const res = await fetch(`${BASE}/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, video_id: videoId }),
  });
  if (!res.ok) throw new Error("Failed to bind video");
  return res.json();
}

export async function sendChatMessage(
  query: string,
  userId: string,
  chatId: string | null,
  videoId: string | null
) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      user_id: userId,
      chat_id: chatId,
      video_id: videoId,
    }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}
