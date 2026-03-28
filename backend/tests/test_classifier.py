"""
tests/test_classifier.py — Unit tests for the classification layer.

Run with:
    cd backend
    pytest tests/ -v
"""

import pytest
from ai.classifier import detect_subject, detect_class_and_chapter, get_confidence
from ai.pipeline import process_file


# ---------------------------------------------------------------------------
# detect_subject
# ---------------------------------------------------------------------------

class TestDetectSubject:
    def test_physics_keywords(self):
        text = "The velocity of a particle under constant force is measured."
        assert detect_subject(text) == "Physics"

    def test_chemistry_keywords(self):
        text = "The mole concept is central to any chemical reaction stoichiometry."
        assert detect_subject(text) == "Chemistry"

    def test_mathematics_keywords(self):
        text = "Evaluate the integral of the function using the limit definition."
        assert detect_subject(text) == "Mathematics"

    def test_unknown_on_insufficient_keywords(self):
        text = "The weather today is quite pleasant."
        assert detect_subject(text) == "Unknown"

    def test_case_insensitive(self):
        text = "FORCE and VELOCITY are key concepts."
        assert detect_subject(text) == "Physics"


# ---------------------------------------------------------------------------
# detect_class_and_chapter
# ---------------------------------------------------------------------------

class TestDetectClassAndChapter:
    def test_physics_chapter_11(self):
        text = "units and measurement are fundamental concepts in physics"
        std, chapter = detect_class_and_chapter(text, "Physics")
        assert chapter == "Units and Measurement"
        assert std == "11"

    def test_physics_chapter_12(self):
        text = "electric charges and fields describe the behaviour of charged particles"
        std, chapter = detect_class_and_chapter(text, "Physics")
        assert chapter == "Electric Charges and Fields"
        assert std == "12"

    def test_maths_chapter_12(self):
        text = "the determinants of a matrix are used in solving linear equations"
        std, chapter = detect_class_and_chapter(text, "Mathematics")
        assert chapter is not None  # at minimum returns something

    def test_chemistry_chapter_11(self):
        text = "structure of atom and its subatomic particles"
        std, chapter = detect_class_and_chapter(text, "Chemistry")
        assert chapter == "Structure of Atom"
        assert std == "11"


# ---------------------------------------------------------------------------
# get_confidence
# ---------------------------------------------------------------------------

class TestGetConfidence:
    def test_returns_float_between_0_and_1(self):
        text = "force velocity energy motion acceleration"
        score = get_confidence(text, "Physics")
        assert 0.0 <= score <= 1.0

    def test_unknown_subject_returns_zero(self):
        assert get_confidence("anything", "Unknown") == 0.0


# ---------------------------------------------------------------------------
# process_file (integration — uses fixture files if present)
# ---------------------------------------------------------------------------

class TestProcessFile:
    def test_missing_file_returns_error(self):
        result = process_file("/nonexistent/path/file.pdf")
        assert "error" in result

    def test_unsupported_extension_returns_error(self):
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            f.write(b"dummy content")
            path = f.name
        try:
            result = process_file(path)
            assert "error" in result
        finally:
            os.unlink(path)