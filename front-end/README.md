# VideoGPT Frontend

A modern, dark-themed AI-powered YouTube video analysis chatbot built with Next.js 14, TypeScript, Tailwind CSS, and Clerk auth.

## Architecture

```
/src
├── app/
│   ├── page.tsx                     # Public landing page (no auth)
│   ├── layout.tsx                   # Root layout with ClerkProvider
│   ├── globals.css                  # Dark theme + custom scrollbars
│   ├── sign-in/[[...sign-in]]/      # Clerk sign-in page
│   ├── sign-up/[[...sign-up]]/      # Clerk sign-up page
│   ├── api/
│   │   └── process-video/route.ts   # Next.js proxy → FastAPI backend
│   └── chatbot/
│       ├── layout.tsx               # Protected layout with sidebar
│       ├── page.tsx                 # New chat (ChatGPT-style URL input)
│       └── chat/[chatId]/page.tsx   # Active chat workspace
├── components/
│   ├── landing/                     # Hero, Features, HowItWorks, Pricing
│   ├── chat/
│   │   ├── ChatSidebar.tsx          # Left sidebar with history
│   │   └── ChatInterface.tsx        # Right chat panel with messages
│   ├── video/
│   │   └── VideoTimelinePanel.tsx   # Left video + timeline panel
│   └── ui/tabs.tsx                  # Radix UI Tabs (shadcn-style)
├── context/VideoContext.tsx         # Video state, seeking, timeline
├── hooks/useChatUserId.ts           # Clerk user ID hook
├── lib/
│   ├── chat-api.ts                  # API calls to FastAPI backend
│   └── utils.ts                     # cn(), timestamp parsers
├── types/index.ts                   # TypeScript interfaces
└── middleware.ts                    # Clerk: protect /chatbot routes only
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard
- `CLERK_SECRET_KEY` — from Clerk dashboard
- `BACKEND_API_URL` — your FastAPI URL (default: `http://localhost:8000`)
- `NEXT_PUBLIC_BACKEND_URL` — same, for client-side use

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key User Flows

### Landing Page (`/`)
- Public access, no auth required
- Shows Hero, Features, HowItWorks, Pricing
- CTA buttons redirect to `/chatbot` (which requires auth)

### Chatbot Home (`/chatbot`)
- **Requires Clerk auth** — unauthenticated users redirected to `/sign-in`
- ChatGPT-style interface with YouTube URL input
- On "Process": calls `/api/process-video` → FastAPI → creates chat → redirects to `/chatbot/chat/{chatId}`

### Chat Workspace (`/chatbot/chat/[chatId]`)
- Split screen: left = video + timeline, right = chat
- Left panel: YouTube iframe, Timeline tab, Highlights tab, "New Video" button
  - Processing a new video **updates** the existing chat's video_id (no new chat created)
- Right panel: message history, typing indicator, timestamp chips that seek the video
- Timestamps extracted from AI responses automatically populate the Timeline

## Backend API Expected

Your FastAPI at `BACKEND_API_URL` should expose:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/process-video` | Process video, returns `{chat_id, video_id, ...}` |
| GET | `/api/chats?user_id=` | List user's chats |
| GET | `/api/chats/{id}?user_id=` | Get chat metadata |
| PATCH | `/api/chats/{id}` | Update video_id |
| GET | `/api/chats/{id}/messages?user_id=` | Get messages |
| POST | `/api/chat` | Send message, returns `{response, chat_id}` |
