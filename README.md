# 🎬 VidBrain — Agentic Multi-Video Corrective RAG Platform

<p align="center">
  <strong>
    Transform YouTube videos into an intelligent knowledge base with 
    Corrective RAG (CRAG), adaptive web search fallbacks, timestamp-aware retrieval, 
    SQLite3 chat persistence, and LangGraph-powered multi-agent workflows.
  </strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Python-green" />
  <img src="https://img.shields.io/badge/LangGraph-Agent%20Workflows-blue" />
  <img src="https://img.shields.io/badge/Pinecone-Vector%20Database-orange" />
  <img src="https://img.shields.io/badge/Tavily-Web%20Search%20Fallback-cyan" />
  <img src="https://img.shields.io/badge/SQLite3-Chat%20Persistence-lightgrey" />
  <img src="https://img.shields.io/badge/Next.js-Full%20Stack-black" />
  <img src="https://img.shields.io/badge/CRAG-Corrective%20RAG-red" />
</p>

---

## 🚀 What Makes VidBrain Different?

Most Video RAG applications fail when a user asks a question outside the video's scope, leading to hallucinations or dry "I don't know" answers. 

VidBrain introduces an **Agentic Multi-Video Corrective RAG (CRAG) Architecture** powered by LangGraph. It bridges semantic video indexing with live web-intelligence fallbacks.

The system dynamically shifts between two operation modes based on the client's `search_scope`:
* 🎯 **Single Video Scope:** Pins semantic queries to a specific video ID with precise timestamped source grounding.
* 🧠 **General/Multi-Video Scope:** Aggregates knowledge across the user's entire catalog within secure isolated namespaces.

---

## 🧠 Agentic Workflow Architecture

The core graph operates on a rigid evaluation loop. If retrieved context fails relevance thresholds, it self-corrects via live web search.

```text
       User Query + Chat Context
                 │
                 ▼
       ┌───────────────────┐
       │  Supervisor Node  │ ◄─── Evaluates Scope ("single_video" vs "general")
       └─────────┬─────────┘
                 │
                 ▼
       ┌───────────────────┐
       │  Retriever Node   │ ◄─── Metadata-Filtered Vector Search (Pinecone)
       └─────────┬─────────┘
                 │
                 ▼
       ┌───────────────────┐
       │  Validator Node   │
       └─────────┬─────────┘
                 │
                 ├──────────────────────────────┐
        [Score ≥ Threshold]            [Score < Threshold]
                 │                              │
                 ▼                              ▼
       ┌───────────────────┐          ┌───────────────────┐
       │   Generate Node   │          │  Web Search Node  │ ◄── Tavily API
       │ (Strict Grounding)│          └─────────┬─────────┘     Live Fallback
       └─────────┬─────────┘                    │
                 │                              ▼
                 │                    ┌───────────────────┐
                 │                    │   Generate Node   │
                 │                    │  (Web Synthesis)  │
                 └───────────────────►└─────────┬─────────┘
                                                │
                                                ▼
                                    Timestamp or Web Source Output
```

---

## ⚡ Specialized AI & Pipeline Nodes

### 🎯 1. Supervisor & Router Node
Determines the runtime path of the state graph. It inspects incoming payloads, maps the `search_scope`, extracts user credentials, and dictates whether the agent searches locally within a specific video metadata boundary or globally across all collections.

### 🔍 2. Pinecone Retriever Node
Performs sub-linear semantic queries on high-dimensional vectors stored in Pinecone. It enforces absolute security separation by locking searches strictly within the active user's namespace (`user_id`).

### ⚖️ 3. Content Validator (Evaluator) Node
Acts as the anti-hallucination guardrail. It grades the retrieved text chunks against the user's prompt. If the text contains insufficient data to guarantee an accurate answer, it flags the graph state as `irrelevant`, routing the flow away from isolated local contexts.

### 🌐 4. Tavily Web Search Fallback Node
When local video assets fail validation, this node triggers a live web search via the **Tavily API Engine**. It fetches real-time global information up to the current date (2026), feeding clean contextual facts back into the generator state.

### ✍️ 5. Citations Generator Node
Synthesizes the final response with strict adherence to sources. It appends deterministic metadata blocks:
* **Video Matches:** Formats references as `منابع: ویدیو ID [ID], زمان [MM:SS]`
* **Web Fallbacks:** Formats references as `منابع: نتایج جستجوی وب`

---

## 💾 Chat Store & Session Persistence

VidBrain manages session states asynchronously using an implicit Thread-Bound SQLite3 architecture:
* **Auto Title Derivation:** Automatically generates high-intent, context-aware thread titles (`derive_chat_title`) during the first user turn.
* **Dual-State Records:** Separately logs `user` inputs and `assistant` outcomes natively into relational schemas to provide seamless front-end synchronization.
* **Performance Grounding:** Utilizes `asyncio.to_thread` wrappers for disk I/O operations to guarantee non-blocking execution across FastAPI's core event loops.

---

## ⚙️ Environment Variables Setup

To spin up the agentic core backend, configure your `.env` file with the following standard infrastructure keys:

```env
# Core Application Setup
APP_NAME="VidBrain Core Backend"
PORT=8000

# Vector Database (Pinecone)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_env
PINECONE_INDEX_NAME=vidbrain-index

# LLM & Agentic Gateway (OpenRouter / OpenAI)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENAI_API_KEY=your_openai_api_key

# Web Search Fallback Engine (Mandatory for CRAG Loop)
TAVILY_API_KEY=tvly-your-actual-api-key-here

# Local Database Settings
SQLITE_DB_PATH=./chat_store.db
```

---

## 🎯 Core Capabilities Checklist

✅ **Agentic CRAG Architecture:** Automated runtime flow correction.  
✅ **Dynamic Routing:** Auto-switches behaviors between unified and single-video horizons.  
✅ **Anti-Hallucination Framework:** Structural validation of contexts prior to synthesis.  
✅ **Tavily Web Intelligence Integration:** Live backup for unindexed topics.  
✅ **Timestamp-Aware Grounding:** Direct mapping of timeline markers.  
✅ **Multi-Tenant Security Isolation:** Complete partitioning of user assets in Pinecone via namespaces.  
✅ **SQLite3 Message Records:** Fully native chat history retention APIs.  
✅ **Asynchronous Non-Blocking Pipeline:** Deep performance tuning utilizing worker thread delegations.  
```