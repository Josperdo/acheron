"""Live Microsoft Graph ingestion — Phase 4 (see ROADMAP.md). Not yet implemented.

Read-only scopes ONLY, ever: Directory.Read.All, RoleManagement.Read.Directory,
Application.Read.All, Group.Read.All. See Security.md before adding any call
here — no write/modify Graph calls are permitted in this module.

Auth will use azure-identity (ClientSecretCredential from AZURE_TENANT_ID /
AZURE_CLIENT_ID / AZURE_CLIENT_SECRET in .env) and msgraph-sdk for the calls
themselves, translating Graph responses into the same (list[Node], list[Edge])
shape that app.ingestion.fixtures.load_fixture returns so app.graph.builder
and app.rules.* don't need to know which ingestion path produced the graph.
"""

from app.models.graph_models import Edge, Node


async def load_live_tenant() -> tuple[list[Node], list[Edge]]:
    raise NotImplementedError("Live Graph ingestion is Phase 4 — use INGESTION_MODE=fixture for now")
