import networkx as nx

from app.graph.builder import build_graph
from app.ingestion.fixtures import load_fixture
from app.models.graph_models import (
    Edge,
    EdgeType,
    Node,
    NodeType,
    PrivilegeTier,
)
from app.rules.app_owner_credential import find_app_owner_credential_paths
from app.rules.engine import run_all_rules
from app.rules.group_owner_escalation import find_group_owner_escalation_paths


def _fixture_graph() -> nx.MultiDiGraph:
    nodes, edges = load_fixture()
    return build_graph(nodes, edges)


def test_app_owner_credential_finds_alice_path():
    graph = _fixture_graph()
    escalations = find_app_owner_credential_paths(graph)

    assert len(escalations) == 1
    escalation = escalations[0]
    assert escalation.source == "user-alice"
    assert escalation.target == "role-global-admin"
    assert escalation.rule == "app_owner_credential"
    assert escalation.type == EdgeType.ESCALATES_TO
    assert escalation.narration


def test_group_owner_escalation_finds_bob_path():
    graph = _fixture_graph()
    escalations = find_group_owner_escalation_paths(graph)

    assert len(escalations) == 1
    escalation = escalations[0]
    assert escalation.source == "user-bob"
    assert escalation.target == "role-priv-role-admin"
    assert escalation.rule == "group_owner_escalation"
    assert escalation.type == EdgeType.ESCALATES_TO
    assert escalation.narration


def test_run_all_rules_combines_both_with_no_extras():
    graph = _fixture_graph()
    escalations = run_all_rules(graph)

    assert len(escalations) == 2
    sources = {e.source for e in escalations}
    assert sources == {"user-alice", "user-bob"}


def test_app_owner_without_can_add_credential_does_not_escalate():
    nodes = [
        Node(id="user-x", type=NodeType.IDENTITY, display_name="x", tier=PrivilegeTier.STANDARD),
        Node(id="app-x", type=NodeType.RESOURCE, display_name="AppX", tier=PrivilegeTier.STANDARD),
        Node(id="role-x", type=NodeType.ROLE, display_name="Global Admin", tier=PrivilegeTier.GLOBAL_ADMIN),
    ]
    edges = [
        Edge(source="user-x", target="app-x", type=EdgeType.OWNS_APP),
        Edge(source="app-x", target="role-x", type=EdgeType.APP_HAS_ROLE),
    ]
    graph = build_graph(nodes, edges)

    assert find_app_owner_credential_paths(graph) == []


def test_app_owner_credential_to_standard_role_does_not_escalate():
    nodes = [
        Node(id="user-x", type=NodeType.IDENTITY, display_name="x", tier=PrivilegeTier.STANDARD),
        Node(id="app-x", type=NodeType.RESOURCE, display_name="AppX", tier=PrivilegeTier.STANDARD),
        Node(id="role-x", type=NodeType.ROLE, display_name="Reader", tier=PrivilegeTier.STANDARD),
    ]
    edges = [
        Edge(source="user-x", target="app-x", type=EdgeType.OWNS_APP),
        Edge(source="user-x", target="app-x", type=EdgeType.CAN_ADD_CREDENTIAL),
        Edge(source="app-x", target="role-x", type=EdgeType.APP_HAS_ROLE),
    ]
    graph = build_graph(nodes, edges)

    assert find_app_owner_credential_paths(graph) == []


def test_group_owner_escalation_to_standard_role_does_not_escalate():
    nodes = [
        Node(id="user-x", type=NodeType.IDENTITY, display_name="x", tier=PrivilegeTier.STANDARD),
        Node(id="group-x", type=NodeType.GROUP, display_name="GroupX", tier=PrivilegeTier.STANDARD),
        Node(id="role-x", type=NodeType.ROLE, display_name="Reader", tier=PrivilegeTier.STANDARD),
    ]
    edges = [
        Edge(source="user-x", target="group-x", type=EdgeType.CAN_ADD_MEMBER),
        Edge(source="group-x", target="role-x", type=EdgeType.GROUP_HAS_ROLE),
    ]
    graph = build_graph(nodes, edges)

    assert find_group_owner_escalation_paths(graph) == []


def test_group_member_of_without_can_add_member_does_not_escalate():
    nodes = [
        Node(id="user-x", type=NodeType.IDENTITY, display_name="x", tier=PrivilegeTier.STANDARD),
        Node(id="group-x", type=NodeType.GROUP, display_name="GroupX", tier=PrivilegeTier.STANDARD),
        Node(id="role-x", type=NodeType.ROLE, display_name="Priv Role Admin", tier=PrivilegeTier.ELEVATED),
    ]
    edges = [
        Edge(source="user-x", target="group-x", type=EdgeType.MEMBER_OF),
        Edge(source="group-x", target="role-x", type=EdgeType.GROUP_HAS_ROLE),
    ]
    graph = build_graph(nodes, edges)

    assert find_group_owner_escalation_paths(graph) == []
