<!-- ============================================================ -->
<!-- 🧠 Agentic Workflow Architecture & ⚡ Specialized AI Nodes    -->
<!-- ============================================================ -->

## 🧠 Agentic Workflow Architecture

The core system is built on a **Single-Flight Deduplication** ingestion engine and a highly resilient **Small-to-Big** retrieval graph. Every query is resolved against conversational memory, routed, retrieved as precise micro-chunks, reranked, expanded to full continuous context, and strictly graded before generation — falling back to live web search only when local evidence is insufficient.

```mermaid
flowchart TD
    START(["▶ START"]) --> CTX

    CTX["🧠 <b>contextualize</b><br/><span style='font-size:11px'>history-aware query rewrite</span>"]
    CTX --> SUP

    SUP["🎯 <b>supervisor</b><br/><span style='font-size:11px'>route: qa vs summary vs scope</span>"]
    SUP -. "video_summary" .-> VS
    SUP -. "video_qa / general_qa" .-> RET

    RET["🔍 <b>retriever</b><br/><span style='font-size:11px'>Pinecone · child micro-chunks</span>"]
    RET --> RRK

    RRK["📊 <b>reranker</b><br/><span style='font-size:11px'>cross-encoder → LLM fallback</span>"]
    RRK --> EXP

    EXP["🗂️ <b>expander</b><br/><span style='font-size:11px'>Small-to-Big parent stitching</span>"]
    EXP --> VAL

    VAL{"⚖️ <b>validator</b><br/><span style='font-size:11px'>strict relevance grading</span>"}
    VAL -- "insufficient evidence" --> WEB
    VAL -- "sufficient evidence" --> GEN

    WEB["🌐 <b>web_search</b><br/><span style='font-size:11px'>Tavily · live fallback</span>"]
    WEB --> GEN

    GEN["✍️ <b>generator</b><br/><span style='font-size:11px'>strict grounded synthesis</span>"]

    VS["📝 <b>video_summary</b><br/><span style='font-size:11px'>full-context evenly sampled</span>"]

    GEN --> END(["⏹ END"])
    VS --> END

    classDef node fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#3b0764,font-weight:600,rx:8,ry:8;
    classDef decision fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#3b0764,font-weight:700;
    classDef terminal fill:#a855f7,stroke:#6b21a8,stroke-width:2px,color:#ffffff,font-weight:700;
    class CTX,SUP,RET,RRK,EXP,WEB,GEN,VS node;
    class VAL decision;
    class START,END terminal;




⚠️ Note on video_summary: This node does not flow through the shared Pinecone retrieval pipeline. Instead of a vector similarity search, it fetches the entire video transcript (Parent chunks) directly from Postgres. To prevent Context Window Overflow on long videos, it applies an Even-Sampling Algorithm across the timeline, ensuring the final summary covers the beginning, middle, and end of the video comprehensively.


    ⚡ Specialized AI & Pipeline Nodes
🚀 0. Single-Flight Ingestion Engine — Viral Video Deduplication
(Pre-Graph Pipeline) To handle viral or trending videos requested by hundreds of users simultaneously, the system employs a Distributed Lock & Single-Flight Request pattern.

When a video is requested, a deterministic Postgres lock (claim_video) ensures only the first user triggers the expensive LLM/Embedding ingestion.

Concurrent requests enter a non-blocking wait_until_ready polling state.

Once processed, subsequent users experience a Cache Hit and are granted ACL access (link_user_video) via a join table. Zero duplicate vectors are stored, saving massive compute and storage costs.

🧠 1. Contextualize / Query-Rewrite Node — Conversational Memory
The entry point of the graph. Pulls the last 4 turns of chat history using a Sliding Budget Window (truncated to avoid token bloat) and resolves the raw user message into a standalone question. Guards against pronoun drift and utilizes strict Pydantic structured outputs to prevent conversational gaps.

🎯 2. Supervisor & Router Node
Determines the runtime path using the resolved query. Inspects search_scope and dictates whether the agent searches locally within a specific video boundary, globally across all collections, or routes straight to structured summarization.

🔍 3. Pinecone Retriever Node — Small-to-Big (Phase 1)
Instead of embedding large blocks of text, this node retrieves Child Micro-Chunks (overlapping 2-line sliding windows) from Pinecone. This ensures sub-linear, hyper-precise semantic hits without context dilution. The chunks are injected with a cheap contextual header (the video title) to resolve coreferences without LLM overhead. It intentionally over-fetches candidates (k=24 or 40) for the reranker.

📊 4. Reranker Node — Noise Filtering
Scores every child chunk against the resolved query using a lightweight local cross-encoder (ms-marco-MiniLM-L-6-v2). Includes an Auto-Fallback Mechanism: if the server lacks RAM to load the local PyTorch model, it gracefully falls back to an LLM-based reranking chain. Trims the noise down to the top-N absolute best hits.

🗂️ 5. Parent Expander Node — Small-to-Big (Phase 2)
The magic behind the system's high context accuracy. It takes the highly ranked child chunks and executes a single IN query against Supabase to fetch their corresponding Context-Rich Parent Passages (10-line blocks).

Edge Stitching: If the exact answer sits at the boundary of a chunk, the algorithm automatically stitches lines from neighboring parents to prevent "Boundary Context Loss".

Precise UI Timestamps: While the LLM reads the large parent passage, the metadata timestamp remains locked to the micro-child's hit time, ensuring the frontend redirects the user to the exact second the answer appears in the video.

⚖️ 6. Content Validator (Evaluator) Node
Acts as the anti-hallucination guardrail. Grades the expanded passages against the resolved query with a strict binary score. If the evidence is insufficient, it flags the graph state and routes away from local context entirely — preventing blended or hallucinated answers.

🌐 7. Tavily Web Search Fallback Node
When local video assets fail validation, this node triggers a live web search wrapped in exponential-backoff retries. Feeds clean factual data back into the generator state and transparently flags the UI that the response was web-sourced.

✍️ 8. Generator Node — Strict Grounded Synthesis
Synthesizes the final response using only the validated context.

Uses a Snap Tolerance algorithm: if the LLM hallucinates a timestamp that doesn't exist in the source transcript (or is off by >15 seconds), the citation is dynamically dropped or snapped to the true nearest marker.

Outputs a highly structured JSON containing chronological, clickable UI cards.