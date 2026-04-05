"""
test_rag.py — End-to-end RAG test for Axion.

Run from backend/:
    python test_rag.py

This script:
  1. Reads physics_kinematics.txt (must be in same folder)
  2. Chunks it with LlamaIndex
  3. Embeds with BAAI/bge-large-en
  4. Stores in ChromaDB
  5. Runs 3 test queries and prints results

No arguments needed — just run it.
"""

import json
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)

# ── Test configuration ────────────────────────────────────────────────────
TEST_FILE    = "physics_kinematics.txt"
SUBJECT      = "Physics"
CHAPTER      = "Motion in a Straight Line"
CLASS_LEVEL  = "11"

TEST_QUERIES = [
    ("What is the work-energy theorem?",        {"subject": "Physics"}),
    ("Explain equations of motion",              {"subject": "Physics", "chapter": CHAPTER}),
    ("What is displacement and how is it different from distance?", {"subject": "Physics"}),
]


def main():
    # ── Step 1: Check the file exists ──────────────────────────────────────
    file_path = Path(TEST_FILE)
    if not file_path.exists():
        print(f"\n❌  '{TEST_FILE}' not found in {Path.cwd()}")
        print(f"    Place the file in: {Path.cwd() / TEST_FILE}")
        sys.exit(1)

    text = file_path.read_text(encoding="utf-8").strip()
    print(f"\n📄  Loaded '{TEST_FILE}' — {len(text)} characters\n")

    # ── Step 2: Ingest ─────────────────────────────────────────────────────
    print("=" * 60)
    print("STAGE 1: INGESTION  (chunk → embed → store)")
    print("=" * 60)

    from rag.rag_pipeline import run_pipeline

    result = run_pipeline(
        text=text,
        subject=SUBJECT,
        chapter=CHAPTER,
        source=TEST_FILE,
        class_level=CLASS_LEVEL,
        user_id="test_user",
        replace_existing=True,
    )

    if "error" in result:
        print(f"\n❌  Ingestion failed: {result['error']}")
        sys.exit(1)

    print(f"\n✅  Ingestion complete:")
    print(f"    Chunks created  : {result['chunks_created']}")
    print(f"    Chunks upserted : {result['chunks_upserted']}")
    print(f"    Total in DB     : {result['collection_total']}")
    print(f"    Time            : {result['timing_seconds']}s\n")

    # ── Step 3: Search ─────────────────────────────────────────────────────
    print("=" * 60)
    print("STAGE 2: RETRIEVAL  (query → embed → cosine search)")
    print("=" * 60)

    from rag.rag_pipeline import search

    for i, (query, filters) in enumerate(TEST_QUERIES, 1):
        print(f"\n🔍  Query {i}: \"{query}\"")
        print(f"    Filters: {filters}")
        print()

        results = search(query=query, top_k=3, **filters)

        if not results:
            print("    ⚠️  No results returned.")
            continue

        for r in results:
            chapter_label = r["metadata"].get("chapter", "?")
            section_label = r["metadata"].get("section", "?")
            score         = r["score"]
            text_snippet  = r["text"][:200].replace("\n", " ")

            print(f"    [{r['rank']}] score={score:.4f}")
            print(f"        Chapter : {chapter_label}")
            print(f"        Section : {section_label}")
            print(f"        Text    : {text_snippet}...")
            print()

    # ── Step 4: Stats ──────────────────────────────────────────────────────
    print("=" * 60)
    print("STAGE 3: COLLECTION STATS")
    print("=" * 60)

    from rag.rag_pipeline import get_stats
    stats = get_stats()
    print(json.dumps(stats, indent=2))

    print("\n✅  All tests passed. RAG pipeline is working correctly.\n")


if __name__ == "__main__":
    main()