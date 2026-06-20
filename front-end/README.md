# Video RAG Assistant

An AI-powered platform that allows users to chat with YouTube videos using Retrieval-Augmented Generation (RAG), semantic search, and timestamp-aware responses.

## Overview

Video RAG Assistant is a full-stack AI application that processes YouTube videos, extracts transcripts, stores semantic embeddings in a vector database, and enables natural language conversations with video content.

The system combines modern AI technologies including LangGraph, Pinecone, and Large Language Models (LLMs) to provide accurate, context-aware answers linked to specific timestamps in videos.

---

## Features

- User Authentication with Clerk
- Multi-user Architecture
- YouTube Transcript Processing
- Semantic Search with Pinecone
- Retrieval-Augmented Generation (RAG)
- LangGraph Workflow Orchestration
- Timestamp-based Video Navigation
- Chat History Storage
- Real-time Streaming Responses
- Responsive Modern UI

---

## Architecture

User
↓
Next.js Frontend
↓
FastAPI Backend
↓
LangGraph Workflow
├── Video RAG Pipeline
│ ├── Pinecone Retrieval
│ └── LLM Response Generation
│
└── Web Search Pipeline
└── Tavily Search

Database:
- Supabase PostgreSQL

Vector Database:
- Pinecone

Authentication:
- Clerk

---

## Tech Stack

### Frontend

- Next.js 15+
- TypeScript
- Tailwind CSS
- shadcn/ui
- Vercel AI SDK

### Backend

- FastAPI
- Python
- LangGraph
- LangChain

### Databases

- Supabase PostgreSQL
- Pinecone Vector Database

### Authentication

- Clerk

### Deployment

- Vercel
- Railway

---

## Project Structure

frontend/
├── app/
├── components/
├── hooks/
├── lib/
└── public/

backend/
├── app/
│ ├── api/
│ ├── services/
│ ├── graphs/
│ ├── models/
│ └── core/
│
└── tests/

---

## Installation

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
poetry install
poetry run uvicorn app.main:app --reload
```

---

## Environment Variables

Frontend:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=
```

Backend:

```env
OPENAI_API_KEY=
PINECONE_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
TAVILY_API_KEY=
```

---

## Deployment

Frontend is deployed on Vercel.

Backend is deployed on Railway.

Database is hosted on Supabase.

Vector search is powered by Pinecone.

---

## Future Improvements

- Video summarization
- Multi-video knowledge base
- Voice interaction
- Agentic workflows
- Advanced analytics

---

## License

MIT License