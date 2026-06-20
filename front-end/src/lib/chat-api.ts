export async function initChat(userId: string): Promise<string> {
  const response = await fetch("/api/chats/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? "Failed to create chat.");
  }

  return data.chat_id as string;
}

export async function bindVideoToChat(
  chatId: string,
  userId: string,
  videoId: string
): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, video_id: videoId }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? data.detail ?? "Failed to bind video to chat.");
  }
}
