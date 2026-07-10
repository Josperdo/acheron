export type NodeType = "identity" | "group" | "role" | "resource";
export type PrivilegeTier = "standard" | "elevated" | "global_admin";

export interface GraphNode {
  id: string;
  type: NodeType;
  display_name: string;
  tier: PrivilegeTier;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface EscalationEdge {
  source: string;
  target: string;
  type: string;
  rule: string;
  narration: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  escalation_edges: EscalationEdge[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getHealth(): Promise<{ status: string }> {
  return get("/health");
}

export function getGraph(): Promise<GraphData> {
  return get("/graph");
}
