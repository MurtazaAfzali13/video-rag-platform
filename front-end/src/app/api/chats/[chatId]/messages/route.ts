import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = searchParams.get("limit") ?? "200";

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(userId)}&limit=${limit}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to fetch messages." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat messages proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
