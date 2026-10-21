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