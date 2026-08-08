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
  <img src="https://img.shields.io/badge/Supabase-Postgres%20RBAC-3ecf8e" />
  <img src="https://img.shields.io/badge/Clerk-RS256%20Auth-6c47ff" />
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

## 📊 Enterprise Analytics Dashboard (RBAC + LangGraph Observability)

Beyond the conversational agent, VidBrain ships with a production-grade **operational dashboard** that turns raw LangGraph execution traces into a real-time, role-aware analytics surface. It answers the question every platform operator eventually asks: *"Who is using the agent, how, and how often?"* — without ever leaking one user's data into another's view.

The dashboard is built as four strictly separated layers, each with a single responsibility:

```text
  Clerk (Identity)         FastAPI (Policy)         Supabase (Data)          Next.js (View)
 ┌─────────────────┐     ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
 │  RS256 session   │ ──► │ JWT verified via   │ ─► │ RPC filters by     │ ─► │ Context + Recharts │
 │  JWT w/ `role`   │     │ JWKS, role read     │    │ p_user_id / NULL   │    │ donut + pill        │
 │  custom claim    │     │ from verified claim │    │ + p_timeframe      │    │ timeframe toggle    │
 └─────────────────┘     └───────────────────┘    └───────────────────┘    └───────────────────┘
```

### 🛡️ 1. Identity & Role — Clerk → FastAPI (JWT, RS256)
Every dashboard request carries a Clerk session token. The backend never trusts anything the client claims about itself in a request body or query string — `user_id` and `role` are extracted **exclusively** from a cryptographically verified JWT:
* Signature verified against Clerk's JWKS (`/.well-known/jwks.json`) using **RS256 only** — the algorithm is pinned explicitly to close the classic "alg confusion" hole (HS256-with-public-key or `alg: none` forgeries).
* `iss` (issuer) is checked against the configured Clerk instance, so a token from a different Clerk tenant can't be replayed.
* `role` is populated via a **custom session token claim** (`{{user.public_metadata.role}}`), configured directly in the Clerk Dashboard — meaning role changes take effect the moment the metadata updates, with no code redeploy.
* Missing or malformed role claims **fail closed** to `"user"` — nobody silently becomes an admin by omission.

### 🗄️ 2. Data Isolation — Supabase RPC (Postgres)
A single `get_workflow_distribution(p_user_id, p_timeframe)` RPC function serves both admins and regular users from one code path — there is no separate "admin query" to drift out of sync:
* `p_user_id IS NULL` → aggregates LangGraph node executions **platform-wide** (admin view).
* `p_user_id = '<clerk_user_id>'` → joins `traces → chats` and filters strictly to that user's own chats (regular user view).
* `p_timeframe` (`today` / `week` / `month` / `all`) narrows the same query by `traces.created_at` using `date_trunc`, so every timeframe and every role is served by one auditable SQL function instead of four hand-written variants.
* Runs as a Postgres function (`SECURITY DEFINER`, `search_path` pinned) so the API layer never needs direct table-level grants — the RPC is the *only* door into `traces`.

### 🧭 3. Policy Enforcement — FastAPI Router
The `/api/dashboard/workflow-distribution` endpoint is the thin, typed glue between identity and data:
* `timeframe` is constrained with a `Literal["today", "week", "month", "all"]` — FastAPI rejects invalid values with a `422` before they ever reach the database.
* `auth.is_admin` (derived from the verified JWT, never from the request) decides whether `p_user_id` is passed as `NULL` or as the caller's own id — the same boolean that gates every other dashboard endpoint (`/metrics`, `/questions-metrics`).
* Supabase/network failures are translated into clean `503`s (`ChatStoreError`) instead of leaking raw driver exceptions to the client.

### 🎨 4. Presentation — React Context + Recharts + Framer Motion
* A `useReducer`-based `DashboardContext` owns loading/error/data state per widget (metrics, questions, workflow distribution) so one slow endpoint never blocks the others.
* The **AI Workflow Distribution** donut chart visualizes LangGraph node execution share (`retriever`, `generator`, `validator`, `web-search`, `other`) with an animated center counter and a live percentage legend.
* A pill-shaped timeframe toggle (`Today / Week / Month / All`) sits directly on the card header, using a Framer Motion `layoutId` to slide a single indicator between options instead of re-rendering four separate buttons — changing the timeframe re-fetches and re-animates the chart in place.

### ✅ Why this design holds up under scrutiny
* **One RPC, one policy** — admin and user paths are the *same* function with a nullable filter, not two functions that can silently drift apart.
* **Server-derived identity only** — the frontend can request any `timeframe`, but it can never request *whose* data to see; that's decided entirely by the verified JWT.
* **Fail-closed everywhere** — unknown roles, unknown timeframes, and unreachable dependencies all degrade to the safest option (`user` role, `all`/no-filter timeframe, clean `5xx`) rather than an undefined or overly-permissive state.

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

# Analytics Dashboard (Supabase + Clerk)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLERK_ISSUER_URL=https://your-app-name.clerk.accounts.dev
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
✅ **RBAC Analytics Dashboard:** Role-aware, timeframe-filterable LangGraph observability backed by a single auditable Supabase RPC.  
✅ **RS256-Verified Identity:** Clerk JWKS-based JWT verification with pinned algorithm and issuer checks — zero trust in client-supplied identity.