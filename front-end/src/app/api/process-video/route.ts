import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_url, user_id, chat_id } = body;
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";

    const response = await fetch(`${backendUrl}/api/process-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url, user_id, chat_id }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to process video" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
