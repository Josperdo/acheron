"""Escalation rule engine — Phase 3 (see ROADMAP.md).

Each rule is its own function: `(graph: nx.MultiDiGraph) -> list[EscalationEdge]`.
The engine's job is just to run every registered rule against the graph and
concatenate the results — each EscalationEdge already carries its own
human-readable `narration` string, which is what the frontend's narration
panel renders as it animates a traced path.
"""

from collections.abc import Callable

import networkx as nx

from app.models.graph_models import EscalationEdge
from app.rules.app_owner_credential import find_app_owner_credential_paths
from app.rules.group_owner_escalation import find_group_owner_escalation_paths

RuleFn = Callable[[nx.MultiDiGraph], list[EscalationEdge]]

REGISTERED_RULES: list[RuleFn] = [
    find_app_owner_credential_paths,
    find_group_owner_escalation_paths,
]


def run_all_rules(graph: nx.MultiDiGraph) -> list[EscalationEdge]:
    escalations: list[EscalationEdge] = []
    for rule in REGISTERED_RULES:
        escalations.extend(rule(graph))
    return escalations
