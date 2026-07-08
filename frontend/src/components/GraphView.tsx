import ForceGraph2D from "react-force-graph-2d";

import type { GraphData, PrivilegeTier } from "../api/client";

const TIER_COLOR: Record<PrivilegeTier, string> = {
  standard: "var(--tier-standard)",
  elevated: "var(--tier-elevated)",
  global_admin: "var(--tier-global-admin)",
};

interface GraphViewProps {
  graph: GraphData;
  onNodeClick: (nodeId: string) => void;
}

/**
 * Renders the identity/permission graph. This is the Phase 5 placeholder —
 * static rendering only. Click-to-trace edge animation (Phase 6) hooks into
 * onNodeClick once app/rules/engine.py computes escalation paths server-side.
 */
export function GraphView({ graph, onNodeClick }: GraphViewProps) {
  const data = {
    nodes: graph.nodes.map((n) => ({ ...n })),
    links: graph.edges.map((e) => ({ ...e })),
  };

  return (
    <ForceGraph2D
      graphData={data}
      backgroundColor="var(--acheron-bg)"
      nodeLabel={(node) => (node as { display_name: string }).display_name}
      nodeColor={(node) => TIER_COLOR[(node as { tier: PrivilegeTier }).tier]}
      linkColor={() => "var(--acheron-border)"}
      onNodeClick={(node) => onNodeClick((node as { id: string }).id)}
    />
  );
}
