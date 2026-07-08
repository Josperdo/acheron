import json
from pathlib import Path

from app.config import settings
from app.models.graph_models import Edge, Node

FIXTURE_FILENAME = "synthetic_tenant.json"


def load_fixture(path: Path | None = None) -> tuple[list[Node], list[Edge]]:
    """Load the default synthetic dataset shipped in fixtures/.

    This is what INGESTION_MODE=fixture (the default, see .env.example) uses,
    so the app runs against a real tenant with zero Azure credentials.
    """
    fixture_path = path or (settings.fixtures_dir / FIXTURE_FILENAME)
    data = json.loads(fixture_path.read_text())

    nodes = [Node(**n) for n in data["nodes"]]
    edges = [Edge(**e) for e in data["edges"]]
    return nodes, edges
