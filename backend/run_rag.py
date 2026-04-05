"""
run_rag.py — Standalone CLI for the Axion RAG pipeline.

Usage examples:

  # Ingest a file
  python run_rag.py ingest physics_kinematics.txt --subject Physics --chapter Kinematics --class 11

  # Search
  python run_rag.py search "What is the work-energy theorem?" --subject Physics --top-k 5

  # Show stats
  python run_rag.py stats

This script can also be imported as a module:

  from run_rag import run_pipeline
  run_pipeline("physics_kinematics.txt", subject="Physics", chapter="Kinematics")
"""

from __future__ import annotations

import argparse
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
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API — matches the spec exactly
# ---------------------------------------------------------------------------

def run_pipeline(
    file_path: str,
    subject: str,
    chapter: str,
    class_level: str = "11",
    user_id: str = "cli_user",
    section: str = "Unknown",
) -> dict:
    """
    Ingest a text file into the Axion RAG knowledge base.

    This is the function specified in the requirements:
        run_pipeline("physics_kinematics.txt", subject="Physics", chapter="Kinematics")

    Args:
        file_path:   Path to a .txt file containing cleaned extracted text.
        subject:     "Physics", "Chemistry", or "Mathematics"
        chapter:     NCERT chapter name, e.g. "Kinematics"
        class_level: "11" or "12"
        user_id:     User identifier for multi-tenant filtering.
        section:     Optional section within the chapter.

    Returns:
        Dict with ingestion stats (chunks_created, chunks_upserted, timing_seconds, ...)

    Example:
        result = run_pipeline(
            "physics_kinematics.txt",
            subject="Physics",
            chapter="Kinematics",
            class_level="11",
        )
        print(f"Indexed {result['chunks_upserted']} chunks in {result['timing_seconds']}s")
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if path.suffix.lower() != ".txt":
        raise ValueError(f"run_pipeline() expects a .txt file, got: {path.suffix}")

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"File is empty: {file_path}")

    logger.info(
        "run_pipeline('%s', subject='%s', chapter='%s', class='%s')",
        file_path, subject, chapter, class_level,
    )

    from rag.rag_pipeline import run_pipeline as _run
    result = _run(
        text=text,
        subject=subject,
        chapter=chapter,
        source=path.name,
        class_level=class_level,
        user_id=user_id,
        section=section,
        replace_existing=True,
    )

    logger.info("Pipeline result: %s", json.dumps(result, indent=2))
    return result


def search_knowledge_base(
    query: str,
    top_k: int = 5,
    subject: str | None = None,
    chapter: str | None = None,
    class_level: str | None = None,
) -> list[dict]:
    """
    Search the ChromaDB knowledge base.

    Args:
        query:       Natural language question.
        top_k:       Number of results.
        subject:     Optional subject filter.
        chapter:     Optional chapter filter.
        class_level: Optional class filter ("11" or "12").

    Returns:
        List of ranked result dicts with text, metadata, and similarity score.
    """
    from rag.rag_pipeline import search
    return search(
        query=query,
        top_k=top_k,
        subject=subject,
        chapter=chapter,
        class_level=class_level,
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _cli():
    parser = argparse.ArgumentParser(description="Axion RAG CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ingest
    ingest_p = subparsers.add_parser("ingest", help="Ingest a .txt file into ChromaDB")
    ingest_p.add_argument("file",    help="Path to .txt file")
    ingest_p.add_argument("--subject", required=True)
    ingest_p.add_argument("--chapter", required=True)
    ingest_p.add_argument("--class",   dest="class_level", default="11")
    ingest_p.add_argument("--user-id", default="cli_user")
    ingest_p.add_argument("--section", default="Unknown")

    # search
    search_p = subparsers.add_parser("search", help="Search the knowledge base")
    search_p.add_argument("query")
    search_p.add_argument("--top-k",   type=int, default=5)
    search_p.add_argument("--subject", default=None)
    search_p.add_argument("--chapter", default=None)
    search_p.add_argument("--class",   dest="class_level", default=None)

    # stats
    subparsers.add_parser("stats", help="Show ChromaDB collection stats")

    args = parser.parse_args()

    if args.command == "ingest":
        result = run_pipeline(
            file_path=args.file,
            subject=args.subject,
            chapter=args.chapter,
            class_level=args.class_level,
            user_id=args.user_id,
            section=args.section,
        )
        print("\n✅ Ingestion complete:")
        print(json.dumps(result, indent=2))

    elif args.command == "search":
        results = search_knowledge_base(
            query=args.query,
            top_k=args.top_k,
            subject=args.subject,
            chapter=args.chapter,
            class_level=args.class_level,
        )
        print(f"\n🔍 Top {len(results)} results for: '{args.query}'\n")
        for r in results:
            print(f"  [{r['rank']}] score={r['score']:.4f} | {r['metadata'].get('chapter','?')} | {r['text'][:120]}...")
            print()

    elif args.command == "stats":
        from rag.rag_pipeline import get_stats
        stats = get_stats()
        print("\n📊 ChromaDB collection stats:")
        print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    _cli()