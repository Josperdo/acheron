"""Live Microsoft Graph ingestion.

Read-only scopes ONLY, ever: Directory.Read.All, RoleManagement.Read.Directory,
Application.Read.All, Group.Read.All. No write/modify Graph calls are
permitted in this module.

Narrow scope: this ingests only what the two escalation rules consume —
users, app ownership + credential capability, an app's service-principal
role assignments, group ownership + membership capability, and group role
assignments. Direct user MemberOf/HasRole edges and service principals as
Identity nodes are not ingested yet (see "Known limitations" in README.md).

Auth uses azure-identity (ClientSecretCredential from AZURE_TENANT_ID /
AZURE_CLIENT_ID / AZURE_CLIENT_SECRET in .env) and msgraph-sdk for the calls
themselves, translating Graph responses into the same (list[Node], list[Edge])
shape that app.ingestion.fixtures.load_fixture returns so app.graph.builder
and app.rules.* don't need to know which ingestion path produced the graph.
"""

from collections import defaultdict
from collections.abc import Iterable
from typing import Any, Protocol

from azure.identity.aio import ClientSecretCredential
from kiota_abstractions.base_request_configuration import RequestConfiguration
from msgraph import GraphServiceClient
from msgraph.generated.applications.applications_request_builder import (
    ApplicationsRequestBuilder,
)
from msgraph.generated.groups.groups_request_builder import GroupsRequestBuilder
from msgraph.generated.models.o_data_errors.o_data_error import ODataError
from msgraph.generated.users.users_request_builder import UsersRequestBuilder

from app.config import settings
from app.models.graph_models import Edge, EdgeType, Node, NodeType, PrivilegeTier

GRAPH_SCOPES = ["https://graph.microsoft.com/.default"]
OWNER_USER_ODATA_TYPE = "#microsoft.graph.user"

# Well-known built-in directory role template IDs. A built-in
# UnifiedRoleDefinition's `id` equals its template ID. Not every one of
# Entra's ~100 built-in roles is classified here — anything absent defaults
# to PrivilegeTier.STANDARD, a known simplification (see "Known limitations" in README.md).
GLOBAL_ADMIN_ROLE_TEMPLATE_ID = "62e90394-69f5-4237-9190-012177145e10"
ELEVATED_ROLE_TEMPLATE_IDS = {
    "e8611ab8-c189-46e8-94e1-60213ab1f814",  # Privileged Role Administrator
    "7be44c8a-adaf-4e2a-84d6-ab2649e08a13",  # Privileged Authentication Administrator
    "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3",  # Application Administrator
    "158c047a-c907-4556-b7ef-446551a6b5f7",  # Cloud Application Administrator
}


class _Paginatable(Protocol):
    async def get(self, request_configuration: Any = None) -> Any: ...
    def with_url(self, url: str) -> "_Paginatable": ...


def _user_node_id(object_id: str) -> str:
    return f"user-{object_id}"


def _app_node_id(object_id: str) -> str:
    return f"app-{object_id}"


def _group_node_id(object_id: str) -> str:
    return f"group-{object_id}"


def _role_node_id(role_definition_id: str) -> str:
    return f"role-{role_definition_id}"


def _classify_tier(role_definition_id: str) -> PrivilegeTier:
    if role_definition_id == GLOBAL_ADMIN_ROLE_TEMPLATE_ID:
        return PrivilegeTier.GLOBAL_ADMIN
    if role_definition_id in ELEVATED_ROLE_TEMPLATE_IDS:
        return PrivilegeTier.ELEVATED
    return PrivilegeTier.STANDARD


def _build_credential() -> ClientSecretCredential:
    return ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )


async def _paginate(builder: _Paginatable, request_configuration: Any = None) -> list[Any]:
    """Walk @odata.nextLink pages for any Graph list response, collecting `.value`."""
    response = await builder.get(request_configuration=request_configuration)
    items: list[Any] = []
    while response is not None:
        items.extend(response.value or [])
        if not response.odata_next_link:
            break
        response = await builder.with_url(response.odata_next_link).get()
    return items


async def _fetch_users(client: GraphServiceClient) -> list[Any]:
    config = RequestConfiguration(
        query_parameters=UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(
            select=["id", "displayName", "userPrincipalName"]
        )
    )
    return await _paginate(client.users, config)


async def _fetch_applications(client: GraphServiceClient) -> list[Any]:
    config = RequestConfiguration(
        query_parameters=ApplicationsRequestBuilder.ApplicationsRequestBuilderGetQueryParameters(
            select=["id", "appId", "displayName"]
        )
    )
    return await _paginate(client.applications, config)


async def _fetch_groups(client: GraphServiceClient) -> list[Any]:
    config = RequestConfiguration(
        query_parameters=GroupsRequestBuilder.GroupsRequestBuilderGetQueryParameters(
            select=["id", "displayName"]
        )
    )
    return await _paginate(client.groups, config)


async def _fetch_role_assignments(
    client: GraphServiceClient,
) -> tuple[dict[str, list[str]], dict[str, Any]]:
    assignments = await _paginate(client.role_management.directory.role_assignments)
    definitions = await _paginate(client.role_management.directory.role_definitions)

    assignments_by_principal: dict[str, list[str]] = defaultdict(list)
    for assignment in assignments:
        assignments_by_principal[assignment.principal_id].append(assignment.role_definition_id)

    definitions_by_id = {definition.id: definition for definition in definitions}
    return assignments_by_principal, definitions_by_id


def _user_owner_ids(owners: Iterable[Any]) -> Iterable[str]:
    return (owner.id for owner in owners if owner.odata_type == OWNER_USER_ODATA_TYPE)


async def _fetch_service_principal(client: GraphServiceClient, app_id: str) -> Any | None:
    """Look up an app registration's service principal, or None if it has none.

    An app registration doesn't always have a service principal (e.g. it was
    never consented to in this tenant). msgraph-sdk raises ODataError on a 404
    rather than returning None, so without this one such app would abort the
    whole ingestion.
    """
    try:
        return await client.service_principals_with_app_id(app_id).get()
    except ODataError as err:
        if err.response_status_code == 404:
            return None
        raise


def _add_role_edge(
    *,
    nodes: list[Node],
    edges: list[Edge],
    role_nodes_added: set[str],
    principal_node_id: str,
    principal_id: str,
    edge_type: EdgeType,
    assignments_by_principal: dict[str, list[str]],
    definitions_by_id: dict[str, Any],
) -> None:
    for role_definition_id in assignments_by_principal.get(principal_id, []):
        role_definition = definitions_by_id.get(role_definition_id)
        if role_definition is None:
            continue

        tier = _classify_tier(role_definition.id)
        if tier == PrivilegeTier.STANDARD:
            continue

        role_node_id = _role_node_id(role_definition.id)
        if role_node_id not in role_nodes_added:
            nodes.append(
                Node(
                    id=role_node_id,
                    type=NodeType.ROLE,
                    display_name=role_definition.display_name or role_definition.id,
                    tier=tier,
                )
            )
            role_nodes_added.add(role_node_id)

        edges.append(Edge(source=principal_node_id, target=role_node_id, type=edge_type))


async def load_live_tenant(
    client: GraphServiceClient | None = None,
) -> tuple[list[Node], list[Edge]]:
    """Ingest the tenant via Microsoft Graph.

    Tests pass a fake `client`. Otherwise this owns the credential and closes
    it via `async with` when ingestion finishes — the aio credential holds an
    HTTP session, and creating one per /graph request without closing it
    leaks connections.
    """
    if client is not None:
        return await _ingest(client)

    async with _build_credential() as credential:
        return await _ingest(GraphServiceClient(credentials=credential, scopes=GRAPH_SCOPES))


async def _ingest(client: GraphServiceClient) -> tuple[list[Node], list[Edge]]:
    users = await _fetch_users(client)
    applications = await _fetch_applications(client)
    groups = await _fetch_groups(client)
    assignments_by_principal, definitions_by_id = await _fetch_role_assignments(client)

    nodes: list[Node] = []
    edges: list[Edge] = []
    role_nodes_added: set[str] = set()

    for user in users:
        nodes.append(
            Node(
                id=_user_node_id(user.id),
                type=NodeType.IDENTITY,
                display_name=user.user_principal_name or user.display_name or user.id,
            )
        )

    for app in applications:
        app_node_id = _app_node_id(app.id)
        nodes.append(
            Node(id=app_node_id, type=NodeType.RESOURCE, display_name=app.display_name or app.id)
        )

        owners = await _paginate(client.applications.by_application_id(app.id).owners)
        for owner_id in _user_owner_ids(owners):
            owner_node_id = _user_node_id(owner_id)
            edges.append(Edge(source=owner_node_id, target=app_node_id, type=EdgeType.OWNS_APP))
            edges.append(
                Edge(source=owner_node_id, target=app_node_id, type=EdgeType.CAN_ADD_CREDENTIAL)
            )

        service_principal = await _fetch_service_principal(client, app.app_id)
        if service_principal is not None:
            _add_role_edge(
                nodes=nodes,
                edges=edges,
                role_nodes_added=role_nodes_added,
                principal_node_id=app_node_id,
                principal_id=service_principal.id,
                edge_type=EdgeType.APP_HAS_ROLE,
                assignments_by_principal=assignments_by_principal,
                definitions_by_id=definitions_by_id,
            )

    for group in groups:
        group_node_id = _group_node_id(group.id)
        nodes.append(
            Node(id=group_node_id, type=NodeType.GROUP, display_name=group.display_name or group.id)
        )

        owners = await _paginate(client.groups.by_group_id(group.id).owners)
        for owner_id in _user_owner_ids(owners):
            owner_node_id = _user_node_id(owner_id)
            edges.append(
                Edge(source=owner_node_id, target=group_node_id, type=EdgeType.CAN_ADD_MEMBER)
            )

        _add_role_edge(
            nodes=nodes,
            edges=edges,
            role_nodes_added=role_nodes_added,
            principal_node_id=group_node_id,
            principal_id=group.id,
            edge_type=EdgeType.GROUP_HAS_ROLE,
            assignments_by_principal=assignments_by_principal,
            definitions_by_id=definitions_by_id,
        )

    return nodes, edges
