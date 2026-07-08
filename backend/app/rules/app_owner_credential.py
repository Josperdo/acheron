"""Rule 1 — App owner -> privileged app -> credential escalation.

Identity owns an app registration; that app's service principal holds a
privileged directory role (e.g. Global Admin); the owner can add a client
secret/cert to an app they own, then authenticate as it. A documented, real
Entra ID attack primitive (see Concept.md).

Graph shape this looks for: Identity --OwnsApp--> Resource(app) --AppHasRole--> Role(privileged)
Not yet implemented — Phase 3 (see ROADMAP.md).
"""

import networkx as nx

from app.models.graph_models import EscalationEdge


def find_app_owner_credential_paths(graph: nx.MultiDiGraph) -> list[EscalationEdge]:
    raise NotImplementedError("Phase 3: implement against fixtures/synthetic_tenant.json")
