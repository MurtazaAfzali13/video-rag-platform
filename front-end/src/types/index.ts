export interface Chat {
  id: string;
  user_id: string;
  title: string;
  video_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ProcessVideoResponse {
  status: string;
  video_id: string;
  chat_id: string;
  chunks_processed: number;
  message: string;
}

export interface TimestampSource {
  time: string;
  label: string;
}
