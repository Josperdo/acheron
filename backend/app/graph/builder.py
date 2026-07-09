import networkx as nx

from app.models.graph_models import Edge, Node


class GraphBuildError(ValueError):
    """Raised when ingested nodes/edges don't form a well-formed graph."""


def build_graph(nodes: list[Node], edges: list[Edge]) -> nx.MultiDiGraph:
    """Assemble the identity/permission graph from ingested nodes and edges.

    Validates referential integrity beyond what pydantic already enforces on
    Node/Edge shape: duplicate node ids and edges pointing at unknown node
    ids raise GraphBuildError instead of silently corrupting the graph (nx
    would otherwise overwrite duplicate nodes or auto-vivify phantom nodes
    for unresolved edge endpoints). Rule functions in app/rules/ operate on
    the returned graph and add EscalationEdge instances computed from it.
    """
    graph = nx.MultiDiGraph()
    seen_ids: set[str] = set()
    for node in nodes:
        if node.id in seen_ids:
            raise GraphBuildError(f"duplicate node id: {node.id!r}")
        seen_ids.add(node.id)
        graph.add_node(node.id, **node.model_dump())

    for edge in edges:
        if edge.source not in seen_ids:
            raise GraphBuildError(
                f"edge {edge.source!r} -> {edge.target!r} ({edge.type}): "
                f"source {edge.source!r} does not match any node id"
            )
        if edge.target not in seen_ids:
            raise GraphBuildError(
                f"edge {edge.source!r} -> {edge.target!r} ({edge.type}): "
                f"target {edge.target!r} does not match any node id"
            )
        graph.add_edge(edge.source, edge.target, type=edge.type)

    return graph
