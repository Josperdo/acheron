from fastapi import APIRouter

from app.config import settings
from app.graph.builder import build_graph
from app.ingestion.fixtures import load_fixture
from app.ingestion.graph_api import load_live_tenant
from app.rules.engine import run_all_rules

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/graph")
async def get_graph() -> dict[str, list[dict]]:
    """Serves the ingested graph plus computed escalation edges for the frontend.

    Dispatches on INGESTION_MODE (see app/config.py): "fixture" (default,
    zero credentials needed) or "live" (Microsoft Graph, see
    app/ingestion/graph_api.py). Escalation edges are computed by running
    every rule in app/rules/engine.py against the built graph.
    """
    if settings.ingestion_mode == "live":
        nodes, edges = await load_live_tenant()
    else:
        nodes, edges = load_fixture()

    graph = build_graph(nodes, edges)
    escalation_edges = run_all_rules(graph)

    return {
        "nodes": [n.model_dump() for n in nodes],
        "edges": [e.model_dump() for e in edges],
        "escalation_edges": [e.model_dump() for e in escalation_edges],
    }
