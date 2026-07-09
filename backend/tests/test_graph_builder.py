import networkx as nx
import pytest

from app.graph.builder import GraphBuildError, build_graph
from app.ingestion.fixtures import load_fixture
from app.models.graph_models import Edge, EdgeType, Node, NodeType, PrivilegeTier


def _node(node_id: str, tier: PrivilegeTier = PrivilegeTier.STANDARD) -> Node:
    return Node(id=node_id, type=NodeType.IDENTITY, display_name=node_id, tier=tier)


def test_build_graph_raises_on_unknown_edge_source():
    nodes = [_node("target-only")]
    edges = [Edge(source="ghost-source", target="target-only", type=EdgeType.MEMBER_OF)]
    with pytest.raises(GraphBuildError, match="ghost-source"):
        build_graph(nodes, edges)


def test_build_graph_raises_on_unknown_edge_target():
    nodes = [_node("source-only")]
    edges = [Edge(source="source-only", target="ghost-target", type=EdgeType.MEMBER_OF)]
    with pytest.raises(GraphBuildError, match="ghost-target"):
        build_graph(nodes, edges)


def test_build_graph_raises_on_duplicate_node_id():
    nodes = [_node("dup"), _node("dup")]
    with pytest.raises(GraphBuildError, match="dup"):
        build_graph(nodes, [])


def test_build_graph_preserves_node_attributes():
    node = Node(
        id="user-test",
        type=NodeType.IDENTITY,
        display_name="test@acheron-demo.onmicrosoft.com",
        tier=PrivilegeTier.ELEVATED,
    )
    graph = build_graph([node], [])
    attrs = graph.nodes["user-test"]
    assert attrs["type"] == NodeType.IDENTITY
    assert attrs["display_name"] == "test@acheron-demo.onmicrosoft.com"
    assert attrs["tier"] == PrivilegeTier.ELEVATED


def test_fixture_has_alice_app_owner_credential_path():
    nodes, edges = load_fixture()
    graph = build_graph(nodes, edges)
    assert nx.has_path(graph, "user-alice", "role-global-admin")

    alice_to_app_types = {
        data["type"] for _, target, data in graph.out_edges("user-alice", data=True) if target == "app-legacy-reporting"
    }
    assert EdgeType.OWNS_APP in alice_to_app_types
    assert EdgeType.CAN_ADD_CREDENTIAL in alice_to_app_types

    app_to_role_types = {
        data["type"]
        for _, target, data in graph.out_edges("app-legacy-reporting", data=True)
        if target == "role-global-admin"
    }
    assert EdgeType.APP_HAS_ROLE in app_to_role_types


def test_fixture_has_bob_group_owner_escalation_path():
    nodes, edges = load_fixture()
    graph = build_graph(nodes, edges)
    assert nx.has_path(graph, "user-bob", "role-priv-role-admin")

    bob_to_group_types = {
        data["type"]
        for _, target, data in graph.out_edges("user-bob", data=True)
        if target == "group-privileged-ops"
    }
    assert EdgeType.CAN_ADD_MEMBER in bob_to_group_types

    group_to_role_types = {
        data["type"]
        for _, target, data in graph.out_edges("group-privileged-ops", data=True)
        if target == "role-priv-role-admin"
    }
    assert EdgeType.GROUP_HAS_ROLE in group_to_role_types
