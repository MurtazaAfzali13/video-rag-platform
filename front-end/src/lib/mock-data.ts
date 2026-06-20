import { Clock, MessageSquare, Video } from "lucide-react";
import type { UIMessage } from "ai";

export const CHAT_HISTORY = [
  {
    group: "Today",
    chats: [
      { id: "1", title: "LangChain Chains Explained", icon: Video },
      { id: "2", title: "RAG Pipeline Overview", icon: MessageSquare },
    ],
  },
  {
    group: "Yesterday",
    chats: [
      { id: "3", title: "Vector Databases 101", icon: Video },
      { id: "4", title: "Prompt Engineering Tips", icon: MessageSquare },
      { id: "5", title: "Fine-tuning vs RAG", icon: Clock },
    ],
  },
];

export const TIMELINE_ITEMS = [
  { id: "1", time: "00:00", title: "Introduction to LangChain" },
  { id: "2", time: "03:15", title: "What are Chains?" },
  { id: "3", time: "08:42", title: "Sequential Chains Demo" },
  { id: "4", time: "12:45", title: "Chains in LangChain" },
  { id: "5", time: "18:20", title: "Router Chains" },
  { id: "6", time: "24:10", title: "Transform Chains" },
  { id: "7", time: "31:55", title: "Summary & Best Practices" },
];

export const TRANSCRIPT_LINES = [
  { time: "00:00", text: "Welcome everyone. Today we're diving deep into LangChain chains." },
  { time: "03:15", text: "A chain is simply a sequence of calls — whether to an LLM, a tool, or a data transformer." },
  { time: "12:45", text: "The most common pattern is the LLMChain, which wraps a prompt template and a language model." },
  { time: "24:10", text: "Transform chains let you modify inputs before passing them to the next step." },
];

export const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "m1",
    role: "user",
    parts: [
      {
        type: "text",
        text: "Can you explain what chains are in LangChain around the 12:45 mark?",
      },
    ],
  },
  {
    id: "m2",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "At 12:45, the instructor explains that **chains** are composable sequences of calls in LangChain. The most common type is the LLMChain, which combines a prompt template with a language model. Chains let you build pipelines where output from one step feeds into the next — perfect for multi-step reasoning, retrieval, and tool use.",
      },
    ],
  },
];

export const RELATED_TIMESTAMPS = ["03:15", "08:42", "12:45", "18:20"];

export const MOCK_ASSISTANT_REPLY =
  "Great question! Based on the video context, chains in LangChain are modular pipelines that connect prompts, models, and tools. The segment at 12:45 walks through LLMChain specifically — how a prompt template and model are wired together for repeatable workflows.";

// Helper function
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}