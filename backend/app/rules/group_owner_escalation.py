"""Rule 2 — Group owner self-add -> privileged group.

Identity owns/can-add-to a group; that group holds a privileged directory
role or Azure RBAC role; identity adds themselves to the group and inherits
the role.

Graph shape this looks for: Identity --CanAddMember--> Group --GroupHasRole--> Role(privileged)
"""

import networkx as nx

from app.models.graph_models import EdgeType, EscalationEdge, EscalationHop, NodeType, PrivilegeTier

RULE_NAME = "group_owner_escalation"


def find_group_owner_escalation_paths(graph: nx.MultiDiGraph) -> list[EscalationEdge]:
    escalations: list[EscalationEdge] = []

    for identity_id, identity_data in graph.nodes(data=True):
        if identity_data.get("type") != NodeType.IDENTITY:
            continue

        for _, group_id, group_edge_data in graph.out_edges(identity_id, data=True):
            if group_edge_data.get("type") != EdgeType.CAN_ADD_MEMBER:
                continue

            group_data = graph.nodes[group_id]

            for _, role_id, role_edge_data in graph.out_edges(group_id, data=True):
                if role_edge_data.get("type") != EdgeType.GROUP_HAS_ROLE:
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
                            f"{identity_data['display_name']} can add members to {group_data['display_name']} → "
                            f"group holds {role_data['display_name']} → "
                            f"{identity_data['display_name']} adds themselves → "
                            f"{identity_data['display_name']} becomes {role_data['display_name']}"
                        ),
                        hops=[
                            EscalationHop(
                                source=identity_id,
                                target=group_id,
                                type=EdgeType.CAN_ADD_MEMBER,
                                narration=f"{identity_data['display_name']} can add members to {group_data['display_name']}",
                            ),
                            EscalationHop(
                                source=group_id,
                                target=role_id,
                                type=EdgeType.GROUP_HAS_ROLE,
                                narration=f"group holds {role_data['display_name']}",
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
