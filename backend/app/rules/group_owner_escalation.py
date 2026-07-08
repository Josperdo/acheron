"""Rule 2 — Group owner self-add -> privileged group.

Identity owns/can-add-to a group; that group holds a privileged directory
role or Azure RBAC role; identity adds themselves to the group and inherits
the role.

Graph shape this looks for: Identity --CanAddMember--> Group --GroupHasRole--> Role(privileged)
Not yet implemented — Phase 3 (see ROADMAP.md).
"""

import networkx as nx

from app.models.graph_models import EscalationEdge


def find_group_owner_escalation_paths(graph: nx.MultiDiGraph) -> list[EscalationEdge]:
    raise NotImplementedError("Phase 3: implement against fixtures/synthetic_tenant.json")
