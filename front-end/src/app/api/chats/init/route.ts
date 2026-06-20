import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id } = body as { user_id?: string };

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/chats/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to initialize chat." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat init proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
