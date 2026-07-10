"""Mocked unit tests for live Graph ingestion — no real tenant/network involved.

Fakes mimic the exact attribute shapes app.ingestion.graph_api reads off the
real msgraph-sdk response models (`.value` / `.odata_next_link` on list
responses, `.odata_type` on owner DirectoryObjects) rather than constructing
real Kiota-generated models, since only those attributes are ever touched.
"""

import asyncio
from types import SimpleNamespace

from app.ingestion.graph_api import (
    ELEVATED_ROLE_TEMPLATE_IDS,
    GLOBAL_ADMIN_ROLE_TEMPLATE_ID,
    load_live_tenant,
)
from app.models.graph_models import EdgeType, NodeType, PrivilegeTier


def _page(value, next_link=None):
    return SimpleNamespace(value=value, odata_next_link=next_link)


def _user(user_id, upn):
    return SimpleNamespace(id=user_id, display_name=upn, user_principal_name=upn)


def _owner_user(user_id):
    return SimpleNamespace(id=user_id, odata_type="#microsoft.graph.user")


def _owner_service_principal(sp_id):
    return SimpleNamespace(id=sp_id, odata_type="#microsoft.graph.servicePrincipal")


def _app(app_id, client_app_id, display_name):
    return SimpleNamespace(id=app_id, app_id=client_app_id, display_name=display_name)


def _group(group_id, display_name):
    return SimpleNamespace(id=group_id, display_name=display_name)


def _role_assignment(principal_id, role_definition_id):
    return SimpleNamespace(principal_id=principal_id, role_definition_id=role_definition_id)


def _role_definition(role_id, display_name):
    return SimpleNamespace(id=role_id, display_name=display_name)


class _FakeBuilder:
    """Stands in for any msgraph-sdk request builder: `.get()` / `.with_url().get()`."""

    def __init__(self, pages):
        self._pages = list(pages)

    async def get(self, request_configuration=None):
        if not self._pages:
            return None
        return self._pages.pop(0)

    def with_url(self, url):
        return self


class _FakeOwnersAccessor:
    def __init__(self, owners):
        self._owners = owners

    @property
    def owners(self):
        return _FakeBuilder([_page(self._owners)])


class _FakeApplications:
    def __init__(self, apps, owners_by_app_id):
        self._builder = _FakeBuilder([_page(apps)])
        self._owners_by_app_id = owners_by_app_id

    def get(self, request_configuration=None):
        return self._builder.get(request_configuration)

    def with_url(self, url):
        return self._builder.with_url(url)

    def by_application_id(self, app_id):
        return _FakeOwnersAccessor(self._owners_by_app_id.get(app_id, []))


class _FakeGroups:
    def __init__(self, groups, owners_by_group_id):
        self._builder = _FakeBuilder([_page(groups)])
        self._owners_by_group_id = owners_by_group_id

    def get(self, request_configuration=None):
        return self._builder.get(request_configuration)

    def with_url(self, url):
        return self._builder.with_url(url)

    def by_group_id(self, group_id):
        return _FakeOwnersAccessor(self._owners_by_group_id.get(group_id, []))


class _FakeDirectory:
    def __init__(self, role_assignments, role_definitions):
        self.role_assignments = _FakeBuilder([_page(role_assignments)])
        self.role_definitions = _FakeBuilder([_page(role_definitions)])


class _FakeRoleManagement:
    def __init__(self, role_assignments, role_definitions):
        self.directory = _FakeDirectory(role_assignments, role_definitions)


class _FakeServicePrincipalLookup:
    def __init__(self, service_principal):
        self._service_principal = service_principal

    async def get(self):
        return self._service_principal


class FakeGraphClient:
    def __init__(
        self,
        *,
        users=(),
        applications=(),
        app_owners=None,
        groups=(),
        group_owners=None,
        service_principals_by_app_id=None,
        role_assignments=(),
        role_definitions=(),
    ):
        self.users = _FakeBuilder([_page(list(users))])
        self.applications = _FakeApplications(list(applications), app_owners or {})
        self.groups = _FakeGroups(list(groups), group_owners or {})
        self.role_management = _FakeRoleManagement(list(role_assignments), list(role_definitions))
        self._service_principals_by_app_id = service_principals_by_app_id or {}

    def service_principals_with_app_id(self, app_id):
        return _FakeServicePrincipalLookup(self._service_principals_by_app_id.get(app_id))


def test_app_owner_with_global_admin_service_principal():
    client = FakeGraphClient(
        users=[_user("u-alice", "alice@example.com")],
        applications=[_app("a-legacy", "client-legacy", "LegacyReportingApp")],
        app_owners={"a-legacy": [_owner_user("u-alice")]},
        service_principals_by_app_id={
            "client-legacy": SimpleNamespace(id="sp-legacy", app_id="client-legacy")
        },
        role_assignments=[_role_assignment("sp-legacy", GLOBAL_ADMIN_ROLE_TEMPLATE_ID)],
        role_definitions=[_role_definition(GLOBAL_ADMIN_ROLE_TEMPLATE_ID, "Global Administrator")],
    )

    nodes, edges = asyncio.run(load_live_tenant(client))

    node_ids = {n.id for n in nodes}
    assert "user-u-alice" in node_ids
    assert "app-a-legacy" in node_ids
    role_node_id = f"role-{GLOBAL_ADMIN_ROLE_TEMPLATE_ID}"
    assert role_node_id in node_ids
    role_node = next(n for n in nodes if n.id == role_node_id)
    assert role_node.tier == PrivilegeTier.GLOBAL_ADMIN
    assert role_node.type == NodeType.ROLE

    edge_signatures = {(e.source, e.target, e.type) for e in edges}
    assert ("user-u-alice", "app-a-legacy", EdgeType.OWNS_APP) in edge_signatures
    assert ("user-u-alice", "app-a-legacy", EdgeType.CAN_ADD_CREDENTIAL) in edge_signatures
    assert ("app-a-legacy", role_node_id, EdgeType.APP_HAS_ROLE) in edge_signatures


def test_group_owner_with_standard_role_does_not_create_role_node():
    client = FakeGraphClient(
        users=[_user("u-dana", "dana@example.com")],
        groups=[_group("g-finance", "Finance-Readers")],
        group_owners={"g-finance": [_owner_user("u-dana")]},
        role_assignments=[_role_assignment("g-finance", "reader-role-id")],
        role_definitions=[_role_definition("reader-role-id", "Directory Readers")],
    )

    nodes, edges = asyncio.run(load_live_tenant(client))

    edge_signatures = {(e.source, e.target, e.type) for e in edges}
    assert ("user-u-dana", "group-g-finance", EdgeType.CAN_ADD_MEMBER) in edge_signatures
    assert not any(e.type == EdgeType.GROUP_HAS_ROLE for e in edges)
    assert not any(n.id == "role-reader-role-id" for n in nodes)


def test_user_pagination_collects_both_pages():
    client = FakeGraphClient()
    client.users = _FakeBuilder(
        [
            _page([_user("u-1", "one@example.com")], next_link="https://graph/next"),
            _page([_user("u-2", "two@example.com")]),
        ]
    )

    nodes, _ = asyncio.run(load_live_tenant(client))

    user_node_ids = {n.id for n in nodes if n.type == NodeType.IDENTITY}
    assert user_node_ids == {"user-u-1", "user-u-2"}


def test_service_principal_owner_is_skipped():
    client = FakeGraphClient(
        applications=[_app("a-svc", "client-svc", "SomeApp")],
        app_owners={"a-svc": [_owner_service_principal("sp-owner")]},
    )

    _, edges = asyncio.run(load_live_tenant(client))

    assert not any(e.type in (EdgeType.OWNS_APP, EdgeType.CAN_ADD_CREDENTIAL) for e in edges)


def test_elevated_role_template_ids_do_not_include_global_admin():
    assert GLOBAL_ADMIN_ROLE_TEMPLATE_ID not in ELEVATED_ROLE_TEMPLATE_IDS
