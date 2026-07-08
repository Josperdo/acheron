from app.graph.builder import build_graph
from app.ingestion.fixtures import load_fixture


def test_fixture_loads_and_parses():
    nodes, edges = load_fixture()
    assert len(nodes) > 0
    assert len(edges) > 0


def test_fixture_builds_into_graph():
    nodes, edges = load_fixture()
    graph = build_graph(nodes, edges)
    assert graph.number_of_nodes() == len(nodes)
    node_ids = {n.id for n in nodes}
    for source, target in graph.edges():
        assert source in node_ids
        assert target in node_ids
