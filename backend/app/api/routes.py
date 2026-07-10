from fastapi import APIRouter

from app.config import settings
from app.ingestion.fixtures import load_fixture
from app.ingestion.graph_api import load_live_tenant

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/graph")
async def get_graph() -> dict[str, list[dict]]:
    """Serves the ingested graph as plain node/edge JSON for the frontend.

    Dispatches on INGESTION_MODE (see app/config.py): "fixture" (default,
    zero credentials needed) or "live" (Microsoft Graph, see
    app/ingestion/graph_api.py). Escalation-edge computation from
    app/rules/engine.py is wired in during Phase 6.
    """
    if settings.ingestion_mode == "live":
        nodes, edges = await load_live_tenant()
    else:
        nodes, edges = load_fixture()
    return {
        "nodes": [n.model_dump() for n in nodes],
        "edges": [e.model_dump() for e in edges],
    }
