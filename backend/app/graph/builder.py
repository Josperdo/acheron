import networkx as nx

from app.models.graph_models import Edge, Node


def build_graph(nodes: list[Node], edges: list[Edge]) -> nx.MultiDiGraph:
    """Assemble the identity/permission graph from ingested nodes and edges.

    Phase 2 (see ROADMAP.md): this currently does a direct load with no
    validation beyond what pydantic already enforces on Node/Edge. Rule
    functions in app/rules/ operate on the returned graph and add
    EscalationEdge instances computed from it.
    """
    graph = nx.MultiDiGraph()
    for node in nodes:
        graph.add_node(node.id, **node.model_dump())
    for edge in edges:
        graph.add_edge(edge.source, edge.target, type=edge.type)
    return graph
