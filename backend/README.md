# AI Video RAG System

An advanced multi-user Video Retrieval-Augmented Generation (RAG) platform that enables semantic interaction with YouTube videos using AI.

The system extracts YouTube transcripts with timestamps, converts them into vector embeddings, stores them in Pinecone, and allows users to ask natural language questions about video content through an intelligent conversational interface.

Built with FastAPI, LangGraph, LangChain, Next.js, Supabase, Pinecone, and OpenRouter.

---

# Overview

This project is designed as a full-stack AI system for semantic video understanding and conversational retrieval.

Unlike traditional keyword-based video search systems, this platform uses semantic embeddings and Retrieval-Augmented Generation (RAG) to understand the meaning of user questions and retrieve the most relevant video segments.

The system also supports timestamp-aware retrieval, allowing users to jump directly to the exact moment in the video where a concept was discussed.

---

# Core Features

## Video Processing Pipeline

- YouTube transcript extraction
- Timestamp-aware transcript ingestion
- Semantic text chunking
- Embedding generation with OpenRouter
- Pinecone vector storage
- Multi-user namespace isolation

---

## AI & Retrieval System

- LangGraph-based orchestration
- Conditional routing system
- Retrieval-Augmented Generation (RAG)
- Semantic similarity search
- Timestamp-aware responses
- Streaming AI responses
- Context-aware conversational memory

---

## Frontend Experience

- Modern chat interface
- Real-time streaming responses
- Multi-chat history sidebar
- Embedded YouTube video player
- Interactive timestamp navigation
- Responsive UI with TailwindCSS and shadcn/ui

---

## Authentication & Security

- Clerk authentication system
- User-based namespace isolation
- Protected API routes
- Multi-tenant architecture
- Role-based access support

---

# System Architecture

```text
User Question
      ↓
LangGraph Router
      ↓
 ┌───────────────┬────────────────┐
 │               │                │
Video Question   General Question
 │               │
 ↓               ↓
Pinecone RAG     Tavily Web Search
 │               │
 └───────┬───────┘
         ↓
    LCEL Response Chain
         ↓
 Streaming AI Response
         ↓
      Frontend UI
```

---

# Video RAG Pipeline

```text
YouTube Video
      ↓
Transcript Extraction
      ↓
Timestamp Preservation
      ↓
Text Chunking
      ↓
Embedding Generation
      ↓
Pinecone Vector Storage
      ↓
Semantic Retrieval
      ↓
LLM Response Generation
```

---

# Semantic Timestamping

One of the core innovations of this project is Semantic Timestamping.

The system not only retrieves semantically relevant information but also identifies the exact timestamp in the video where the relevant concept appears.

This enables users to navigate directly to the most meaningful video segments instead of manually searching through long videos.

---

# Tech Stack

## Backend

- FastAPI
- LangChain
- LangGraph
- LCEL
- Python
- Poetry
- Uvicorn

---

## Frontend

- Next.js App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Vercel AI SDK

---

## Database & Infrastructure

- Supabase (PostgreSQL)
- Pinecone Vector Database
- Clerk Authentication
- Railway Deployment
- Vercel Deployment

---

## AI & Search

- OpenRouter
- Tavily Search API
- Retrieval-Augmented Generation (RAG)

---

# Project Structure

```text
project-root/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── ingestion.py
│   │   ├── retrieval.py
│   │   ├── graph.py
│   │   ├── youtube_client.py
│   │   ├── config.py
│   │   └── database.py
│   │
│   ├── pyproject.toml
│   └── .env
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── public/
│
└── README.md
```

---

# Multi-Tenant Architecture

The system uses namespace-based isolation in Pinecone.

Each user's vectors are stored under a unique namespace using:

```python
namespace = user_id
```

This ensures:

- User data isolation
- Secure semantic retrieval
- Scalable multi-user architecture

---

# Installation

## Clone the Repository

```bash
git clone https://github.com/your-username/ai-video-rag-system.git
```

---

# Backend Setup

```bash
cd backend
poetry install
```

---

# Frontend Setup

```bash
cd frontend
npm install
```

---

# Environment Variables

Create a `.env` file in the backend directory:

```env
OPENROUTER_API_KEY=your_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

PINECONE_API_KEY=your_key
INDEX_NAME=video-rag

SUPABASE_URL=your_url
SUPABASE_KEY=your_key

CLERK_SECRET_KEY=your_key
```

---

# Running the Backend

```bash
poetry run uvicorn app.main:app --reload
```

---

# Running the Frontend

```bash
npm run dev
```

---

# API Endpoints

## Health Check

```http
GET /health
```

---

## Process Video

```http
POST /api/process-video
```

### Request

```json
{
  "video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "user_id": "user123"
}
```

---

## Chat Endpoint

```http
POST /api/chat
```

### Request

```json
{
  "message": "What did the video say about AI?",
  "user_id": "user123"
}
```

---

# Agile Development Roadmap

## Sprint 1 — Foundations

- FastAPI setup
- Next.js setup
- Supabase integration
- Clerk authentication

---

## Sprint 2 — Video Engine

- YouTube transcript extraction
- Semantic chunking
- Pinecone indexing

---

## Sprint 3 — AI Orchestration

- LangGraph router
- RAG pipeline
- Tavily web search
- LCEL integration

---

## Sprint 4 — Frontend Experience

- Streaming chat UI
- YouTube synchronization
- Timestamp navigation

---

## Sprint 5 — Optimization & Deployment

- Prompt optimization
- Error handling
- Railway deployment
- Vercel deployment

---

# Future Improvements

- Hybrid Search
- Reranking
- Voice Interaction
- Video Summarization
- AI Agent Workflows
- Memory System
- Citation-aware Responses
- Multi-modal Retrieval
- Real-time Collaboration

---

# Research Contribution

This project explores the integration of:

- Retrieval-Augmented Generation (RAG)
- Semantic Video Understanding
- Timestamp-aware Retrieval
- Multi-user Vector Databases
- AI Orchestration with LangGraph

for building next-generation AI-powered educational and conversational video systems.

---

# License

MIT License