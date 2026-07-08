"""Escalation rule engine — Phase 3 (see ROADMAP.md). Not yet implemented.

Each rule is its own function: `(graph: nx.MultiDiGraph) -> list[EscalationEdge]`.
The engine's job is just to run every registered rule against the graph and
concatenate the results — each EscalationEdge already carries its own
human-readable `narration` string, which is what the frontend's narration
panel renders as it animates a traced path.
"""

from collections.abc import Callable

import networkx as nx

from app.models.graph_models import EscalationEdge

RuleFn = Callable[[nx.MultiDiGraph], list[EscalationEdge]]

REGISTERED_RULES: list[RuleFn] = []


def run_all_rules(graph: nx.MultiDiGraph) -> list[EscalationEdge]:
    escalations: list[EscalationEdge] = []
    for rule in REGISTERED_RULES:
        escalations.extend(rule(graph))
    return escalations
