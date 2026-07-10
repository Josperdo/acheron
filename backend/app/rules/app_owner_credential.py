"""Rule 1 — App owner -> privileged app -> credential escalation.

Identity owns an app registration; that app's service principal holds a
privileged directory role (e.g. Global Admin); the owner can add a client
secret/cert to an app they own, then authenticate as it. A documented, real
Entra ID attack primitive (see Concept.md).

Graph shape this looks for: Identity --OwnsApp--> Resource(app) --AppHasRole--> Role(privileged)
"""

import networkx as nx

from app.models.graph_models import EdgeType, EscalationEdge, EscalationHop, NodeType, PrivilegeTier
from app.rules._shared import has_edge_type

RULE_NAME = "app_owner_credential"


def find_app_owner_credential_paths(graph: nx.MultiDiGraph) -> list[EscalationEdge]:
    escalations: list[EscalationEdge] = []

    for identity_id, identity_data in graph.nodes(data=True):
        if identity_data.get("type") != NodeType.IDENTITY:
            continue

        for _, app_id, app_edge_data in graph.out_edges(identity_id, data=True):
            if app_edge_data.get("type") != EdgeType.OWNS_APP:
                continue
            if not has_edge_type(graph, identity_id, app_id, EdgeType.CAN_ADD_CREDENTIAL):
                continue

            app_data = graph.nodes[app_id]

            for _, role_id, role_edge_data in graph.out_edges(app_id, data=True):
                if role_edge_data.get("type") != EdgeType.APP_HAS_ROLE:
                    continue

                role_data = graph.nodes[role_id]
                if role_data.get("tier") == PrivilegeTier.STANDARD:
                    continue

                escalations.append(
                    EscalationEdge(
                        source=identity_id,
                        target=role_id,
                        type=EdgeType.ESCALATES_TO,
                        rule=RULE_NAME,
                        narration=(
                            f"{identity_data['display_name']} owns {app_data['display_name']} → "
                            f"app holds {role_data['display_name']} → "
                            f"{identity_data['display_name']} can add credentials → "
                            f"{identity_data['display_name']} becomes {role_data['display_name']}"
                        ),
                        hops=[
                            EscalationHop(
                                source=identity_id,
                                target=app_id,
                                type=EdgeType.OWNS_APP,
                                narration=f"{identity_data['display_name']} owns {app_data['display_name']}",
                            ),
                            EscalationHop(
                                source=app_id,
                                target=role_id,
                                type=EdgeType.APP_HAS_ROLE,
                                narration=f"app holds {role_data['display_name']}",
                            ),
                            EscalationHop(
                                source=identity_id,
                                target=app_id,
                                type=EdgeType.CAN_ADD_CREDENTIAL,
                                narration=f"{identity_data['display_name']} can add credentials",
                            ),
                            EscalationHop(
                                source=identity_id,
                                target=role_id,
                                type=EdgeType.ESCALATES_TO,
                                narration=f"{identity_data['display_name']} becomes {role_data['display_name']}",
                            ),
                        ],
                    )
                )

    return escalations
