# Axion - AI Study System

Axion is a study-focused RAG system that turns uploaded notes and PDFs into searchable, chapter-aware knowledge.

It is designed to:
- upload handwritten or PDF notes
- detect subject and chapter automatically
- chunk content intelligently using LlamaIndex
- generate embeddings with BAAI/bge-large-en
- store chunks and metadata in ChromaDB
- retrieve relevant passages with semantic search

---

## What is implemented right now

### 1. PDF / text ingestion pipeline
The backend can ingest a text file, split it into semantic chunks, embed those chunks, and store them in ChromaDB.

The current pipeline has been tested end to end with:
- `physics_kinematics.txt`
- subject: `Physics`
- chapter: `Motion in a Straight Line`

The test run created 30 chunks and successfully stored all 30 in ChromaDB.

### 2. LlamaIndex-based chunking
Chunking is handled with LlamaIndex sentence-window parsing rather than naive fixed-size splitting.

That means:
- chunks respect sentence boundaries
- nearby context is preserved with a sliding window
- section headings are carried into the chunk metadata/text
- retrieval can use surrounding context instead of only the exact chunk

### 3. BGE embeddings
The project uses:
- `BAAI/bge-large-en`

This model is used to convert each chunk into a dense vector for semantic retrieval.

The current implementation:
- loads the model locally through Hugging Face
- produces 1024-dimensional embeddings
- normalizes embeddings for cosine-based retrieval

### 4. ChromaDB vector storage
The vector database is set up with persistent local storage.

Current behavior:
- database path: `backend/chroma_db`
- collection name: `axion_knowledge_base`
- chunk text, embeddings, and metadata are stored together
- re-ingesting the same source replaces old chunks instead of duplicating them

### 5. Retrieval testing script
`run_rag.py` / `test_rag.py` can be used to:
- ingest a file manually
- search the knowledge base
- inspect collection stats

---

## What the latest test actually proved

The latest run showed that the system is working correctly:

- the file was found and loaded
- 30 chunks were created from the sample physics text
- embeddings were generated successfully with BGE
- all 30 chunks were saved into ChromaDB
- semantic search returned highly relevant results for:
  - work-energy theorem
  - equations of motion
  - displacement vs distance

That means the core RAG pipeline is functional.

---

## Project architecture

```text
backend/
├── rag/
│   ├── chunking.py      # LlamaIndex chunking logic
│   ├── embedding.py     # BGE embedding model wrapper
│   ├── vectordb.py      # ChromaDB setup, insert, query, stats
│   ├── rag_pipeline.py  # Orchestrates chunk → embed → store
├── routes/
│   ├── upload.py        # Upload route integrated with RAG ingestion
├── run_rag.py           # CLI for ingestion, search, and stats
├── test_rag.py          # End-to-end validation script
└── chroma_db/           # Persistent vector storage
```

---

## How the ingestion pipeline works

1. A note or PDF is uploaded.
2. The text is classified into subject and chapter.
3. LlamaIndex splits the document into context-aware chunks.
4. Each chunk is embedded using `BAAI/bge-large-en`.
5. ChromaDB stores the chunk text, vector, and metadata.
6. The chunk becomes searchable through semantic retrieval.

---

## Metadata stored with each chunk

Each chunk is enriched with metadata such as:
- subject
- chapter
- section
- source filename
- page number, if available

This matters because it allows filtered search, for example:
- only Physics chunks
- only one chapter
- only a specific uploaded file

---

## How to run the system

### Ingest a file
```bash
python run_rag.py ingest physics_kinematics.txt --subject Physics --chapter "Motion in a Straight Line" --class 11
```

### Search the knowledge base
```bash
python run_rag.py search "What is the work-energy theorem?" --subject Physics
```

### Check database stats
```bash
python run_rag.py stats
```

### Run the full round-trip test
```bash
python test_rag.py
```

---

## What the sample test file is for

The included sample physics text file is only a test fixture.

It exists so you can verify that:
- chunking works
- embeddings are generated
- vectors are stored
- retrieval returns useful answers

This is useful for debugging before connecting real user uploads.

---

## Why this matters

This is the foundation of Axion.

Before adding answer generation, UI polish, reranking, or personalization, the system needs:
- correct chunking
- reliable embeddings
- clean vector storage
- good retrieval quality

That foundation is now in place.

---

## Next planned work

The next layers to build are:
- retrieval reranking
- answer generation using an LLM
- better metadata extraction from PDFs
- query routing by subject and intent
- evaluation metrics for retrieval quality
- a polished UI for search and chat

---

## Status

Core RAG ingestion and retrieval are working.
The system can now store subject-aware chunks in ChromaDB and retrieve them semantically.

That means Axion is past the prototype stage and into the first real working version.
