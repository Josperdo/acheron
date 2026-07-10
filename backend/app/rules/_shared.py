"""Small helpers shared by rule implementations in this package."""

import networkx as nx

from app.models.graph_models import EdgeType


def has_edge_type(graph: nx.MultiDiGraph, source: str, target: str, edge_type: EdgeType) -> bool:
    """Whether any parallel edge from source to target has the given type."""
    edge_data = graph.get_edge_data(source, target)
    if not edge_data:
        return False
    return any(data.get("type") == edge_type for data in edge_data.values())
