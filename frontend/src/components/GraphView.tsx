import ForceGraph2D from "react-force-graph-2d";

import type { GraphData, GraphNode, PrivilegeTier } from "../api/client";

interface RenderNode extends GraphNode {
  x?: number;
  y?: number;
}

interface RenderLink {
  source: string;
  target: string;
  isEscalation: boolean;
  label: string;
}

interface GraphViewProps {
  graph: GraphData;
  onNodeClick: (nodeId: string) => void;
}

/**
 * Canvas 2D fillStyle/strokeStyle don't understand CSS `var(--x)` syntax —
 * that's a CSS-cascade feature the Canvas API never resolves. Colors used
 * inside ForceGraph2D's canvas rendering (node/link colors, pulse glow) must
 * be literal values, so we resolve theme.css's custom properties once here
 * rather than hardcoding colors that could drift from the theme.
 */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Renders the identity/permission graph, distinguishing computed
 * EscalationEdge paths (amber, dashed, animated) from raw ingested edges
 * (solid gray), with a pulsing glow on Global Admin-tier nodes. Static
 * rendering only — click-to-trace edge animation is Phase 6.
 */
export function GraphView({ graph, onNodeClick }: GraphViewProps) {
  const tierColor: Record<PrivilegeTier, string> = {
    standard: cssVar("--tier-standard"),
    elevated: cssVar("--tier-elevated"),
    global_admin: cssVar("--tier-global-admin"),
  };
  const backgroundColor = cssVar("--acheron-bg");
  const rawEdgeColor = cssVar("--acheron-border");
  const escalationEdgeColor = tierColor.elevated;

  const nodes: RenderNode[] = graph.nodes.map((n) => ({ ...n }));
  const links: RenderLink[] = [
    ...graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      isEscalation: false,
      label: e.type,
    })),
    ...graph.escalation_edges.map((e) => ({
      source: e.source,
      target: e.target,
      isEscalation: true,
      label: e.narration,
    })),
  ];

  return (
    <ForceGraph2D<RenderNode, RenderLink>
      graphData={{ nodes, links }}
      backgroundColor={backgroundColor}
      autoPauseRedraw={false}
      nodeLabel={(node) => node.display_name}
      nodeColor={(node) => tierColor[node.tier]}
      nodeCanvasObjectMode="before"
      nodeCanvasObject={(node, ctx) => {
        if (node.tier !== "global_admin" || node.x === undefined || node.y === undefined) {
          return;
        }
        const pulse = (Math.sin(Date.now() / 300) + 1) / 2; // oscillates 0..1
        const radius = 6 + pulse * 6;
        ctx.save();
        ctx.globalAlpha = 0.4 * (1 - pulse) + 0.1;
        ctx.fillStyle = tierColor.global_admin;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }}
      linkLabel={(link) => link.label}
      linkColor={(link) => (link.isEscalation ? escalationEdgeColor : rawEdgeColor)}
      linkWidth={(link) => (link.isEscalation ? 2 : 1)}
      linkLineDash={(link) => (link.isEscalation ? [4, 2] : null)}
      linkDirectionalParticles={(link) => (link.isEscalation ? 2 : 0)}
      linkDirectionalParticleWidth={2}
      onNodeClick={(node) => onNodeClick(node.id as string)}
    />
  );
}
