from enum import StrEnum

from pydantic import BaseModel


class NodeType(StrEnum):
    IDENTITY = "identity"
    GROUP = "group"
    ROLE = "role"
    RESOURCE = "resource"


class PrivilegeTier(StrEnum):
    STANDARD = "standard"
    ELEVATED = "elevated"
    GLOBAL_ADMIN = "global_admin"


class EdgeType(StrEnum):
    MEMBER_OF = "MemberOf"
    HAS_ROLE = "HasRole"
    OWNS_APP = "OwnsApp"
    APP_HAS_ROLE = "AppHasRole"
    CAN_ADD_CREDENTIAL = "CanAddCredential"
    CAN_RESET_PASSWORD = "CanResetPassword"
    CAN_ADD_MEMBER = "CanAddMember"
    GROUP_HAS_ROLE = "GroupHasRole"
    ESCALATES_TO = "EscalatesTo"


class Node(BaseModel):
    id: str
    type: NodeType
    display_name: str
    tier: PrivilegeTier = PrivilegeTier.STANDARD


class Edge(BaseModel):
    source: str
    target: str
    type: EdgeType


class EscalationHop(BaseModel):
    """One step of an EscalationEdge's underlying path, for hop-by-hop animation."""

    source: str
    target: str
    type: EdgeType
    narration: str


class EscalationEdge(Edge):
    """An edge computed by a rule in app/rules/, not a raw ingested relationship."""

    rule: str
    narration: str
    hops: list[EscalationHop]
