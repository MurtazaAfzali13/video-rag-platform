import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    
    const { userId, getToken } = await auth();

    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getToken();

    const body = await request.json();
    const { video_url, chat_id } = body;
    
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";

    const response = await fetch(`${backendUrl}/api/process-video`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ video_url, chat_id }),
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