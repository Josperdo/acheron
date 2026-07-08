from fastapi import APIRouter

from app.ingestion.fixtures import load_fixture

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/graph")
def get_graph() -> dict[str, list[dict]]:
    """Serves the ingested graph as plain node/edge JSON for the frontend.

    Only fixture-mode ingestion exists today (see app/ingestion/graph_api.py
    for the live-tenant path, Phase 4). Escalation-edge computation from
    app/rules/engine.py is wired in during Phase 3.
    """
    nodes, edges = load_fixture()
    return {
        "nodes": [n.model_dump() for n in nodes],
        "edges": [e.model_dump() for e in edges],
    }
