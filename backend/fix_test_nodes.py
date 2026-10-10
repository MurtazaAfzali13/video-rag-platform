"""One-off helper: updates app/graph/tests/test_nodes.py for the new child-chunk retriever.

Run from the backend folder (the one that contains app/):
    poetry run python fix_test_nodes.py
Then delete this file. A backup is written to test_nodes.py.bak. Safe to run twice.
What it does:
  1. adds CHILD_K_SINGLE_VIDEO / CHILD_K_GENERAL to the nodes import
  2. adds VideoSummarySchema to the state import (fixes the NameError that already exists on main)
  3. replaces the old test_retriever_node_single_video (mocked as_retriever) with two new tests
"""
import re
import shutil
import sys
from pathlib import Path

PATH = Path("app/graph/tests/test_nodes.py")

NEW_TESTS = '''    @patch('app.graph.nodes.PineconeVectorStore')
    @patch('app.graph.nodes._get_embeddings')
    @patch('app.graph.nodes.get_settings')
    def test_retriever_node_single_video(self, mock_get_settings, mock_embeddings, mock_vector_store):
        """Retriever returns CHILD chunks (with parent linkage) for a single video."""
        mock_settings = Mock()
        mock_settings.index_name = "test_index"
        mock_settings.pinecone_api_key = "test_key"
        mock_get_settings.return_value = mock_settings

        mock_doc = Mock()
        mock_doc.page_content = "Test content"
        mock_doc.metadata = {
            "video_id": "video456",
            "title": "Test Video",
            "start_time": 120,
            "parent_id": "video456_p0003",
            "parent_idx": 3,
            "parent_count": 10,
            "child_pos": 0,
            "child_count": 9,
        }
        instance = Mock()
        instance.similarity_search_with_score.return_value = [(mock_doc, 0.87)]
        mock_vector_store.return_value = instance

        state: AgentState = {
            "query": "What is the main concept?",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": None,
            "response": None,
        }

        result = retriever_node(state)

        instance.similarity_search_with_score.assert_called_once()
        _, kwargs = instance.similarity_search_with_score.call_args
        assert kwargs["filter"] == {"video_id": {"$eq": "video456"}}
        assert kwargs["k"] == CHILD_K_SINGLE_VIDEO

        doc = result["documents"][0]
        assert doc["page_content"] == "Test content"
        assert doc["video_id"] == "video456"
        assert doc["start_time"] == 120.0
        assert doc["parent_id"] == "video456_p0003"
        assert doc["child_pos"] == 0
        assert doc["vector_score"] == 0.87
        assert doc["source_type"] == "video"
        assert "retriever_time_ms" in result

    @patch('app.graph.nodes.PineconeVectorStore')
    @patch('app.graph.nodes._get_embeddings')
    @patch('app.graph.nodes.get_settings')
    def test_retriever_node_general_scope_and_legacy_vectors(self, mock_get_settings, mock_embeddings, mock_vector_store):
        """General scope searches all videos; vectors without parent metadata still work."""
        mock_settings = Mock()
        mock_settings.index_name = "i"
        mock_settings.pinecone_api_key = "k"
        mock_get_settings.return_value = mock_settings

        legacy = Mock()
        legacy.page_content = "old chunk"
        legacy.metadata = {"video_id": "v1", "title": "T", "start_time": 5}
        instance = Mock()
        instance.similarity_search_with_score.return_value = [(legacy, 0.5)]
        mock_vector_store.return_value = instance

        result = retriever_node({
            "query": "q", "search_scope": "general", "user_id": "u", "video_id": None,
            "messages": [], "next_node": None, "documents": None, "response": None,
        })

        _, kwargs = instance.similarity_search_with_score.call_args
        assert kwargs["filter"] is None
        assert kwargs["k"] == CHILD_K_GENERAL
        doc = result["documents"][0]
        assert doc["parent_id"] is None
        assert doc["page_content"] == "old chunk"

'''


def main() -> int:
    if not PATH.exists():
        print(f"Cannot find {PATH}. Run this from the backend folder.")
        return 2
    text = PATH.read_text(encoding="utf-8")
    crlf = "\r\n" in text
    text = text.replace("\r\n", "\n")

    if "CHILD_K_SINGLE_VIDEO" in text and "test_retriever_node_general_scope_and_legacy_vectors" in text:
        print("Already updated. Nothing to do.")
        return 0

    shutil.copyfile(PATH, PATH.with_suffix(".py.bak"))

    # 1) nodes import
    if "CHILD_K_SINGLE_VIDEO" not in text:
        marker = "from app.graph.nodes import (\n"
        if marker not in text:
            print("Could not find 'from app.graph.nodes import (' - edit the import by hand.")
            return 1
        text = text.replace(marker, marker + "    CHILD_K_GENERAL,\n    CHILD_K_SINGLE_VIDEO,\n", 1)

    # 2) state import
    if "VideoSummarySchema" not in text.split("class TestNodes", 1)[0]:
        old = "from app.graph.state import AgentState\n"
        if old in text:
            text = text.replace(old, "from app.graph.state import AgentState, VideoSummarySchema\n", 1)
        else:
            print("Could not find 'from app.graph.state import AgentState' - edit it by hand.")
            return 1

    # 3) replace the old retriever test (decorators + function body)
    lines = text.split("\n")
    try:
        def_idx = next(i for i, l in enumerate(lines) if "def test_retriever_node_single_video" in l)
    except StopIteration:
        print("test_retriever_node_single_video not found - nothing replaced.")
        return 1
    start = def_idx
    while start > 0 and lines[start - 1].startswith("    @"):
        start -= 1
    end = next(
        (i for i in range(def_idx + 1, len(lines)) if re.match(r"^    (@|def |async def )", lines[i]) or re.match(r"^\S", lines[i])),
        len(lines),
    )
    new_lines = lines[:start] + NEW_TESTS.rstrip("\n").split("\n") + [""] + lines[end:]
    out = "\n".join(new_lines)
    if crlf:
        out = out.replace("\n", "\r\n")
    PATH.write_text(out, encoding="utf-8", newline="")
    print(f"Updated {PATH} (backup: {PATH.with_suffix('.py.bak')}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
