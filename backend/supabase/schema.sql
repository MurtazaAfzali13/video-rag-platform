-- Supabase schema for VideoGPT chat persistence
-- Run in Supabase SQL editor

create table if not exists chats (
  id uuid primary key,
  user_id text not null,
  title text not null,
  video_id text,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key,
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chats_user_id on chats(user_id);
create index if not exists idx_messages_chat_id on messages(chat_id);
