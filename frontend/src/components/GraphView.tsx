import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";

import type { EscalationHop, GraphData, GraphNode, PrivilegeTier } from "../api/client";

interface RenderNode extends GraphNode {
  x?: number;
  y?: number;
}

interface RenderLink {
  source: string;
  target: string;
  // force-graph mutates `source`/`target` in place, replacing the string
  // ids with resolved node object references once the physics simulation
  // runs. sourceId/targetId are untouched copies kept for activeHop
  // matching, which needs the original string ids.
  sourceId: string;
  targetId: string;
  type: string;
  isEscalation: boolean;
  label: string;
}

interface GraphViewProps {
  graph: GraphData;
  activeHop: EscalationHop | null;
  onNodeClick: (nodeId: string) => void;
}

const NODE_SIZE: Record<PrivilegeTier, number> = {
  standard: 3,
  elevated: 5,
  global_admin: 7,
};

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

function isActiveHop(link: RenderLink, activeHop: EscalationHop | null): boolean {
  return (
    activeHop !== null &&
    link.sourceId === activeHop.source &&
    link.targetId === activeHop.target &&
    link.type === activeHop.type
  );
}

/**
 * Renders the identity/permission graph, distinguishing computed
 * EscalationEdge paths (amber, dashed, animated) from raw ingested edges
 * (solid gray), with a pulsing glow + size hierarchy on Global Admin-tier
 * nodes. Node names show on hover (nodeLabel) rather than always-on canvas
 * text — with several nodes close together, permanent labels overlapped
 * and read as clutter. When `activeHop` is set (click-to-trace, Phase 6),
 * the matching link is highlighted in sequence with NarrationPanel's hop
 * text.
 */
export function GraphView({ graph, activeHop, onNodeClick }: GraphViewProps) {
  const tierColor: Record<PrivilegeTier, string> = {
    standard: cssVar("--tier-standard"),
    elevated: cssVar("--tier-elevated"),
    global_admin: cssVar("--tier-global-admin"),
  };
  const backgroundColor = cssVar("--acheron-bg");
  // --acheron-border is a subtle UI-divider color, too low-contrast against
  // the canvas background to read as a graph edge; --acheron-text-dim (used
  // for secondary text elsewhere) has better contrast while staying muted
  // relative to the amber escalation edges.
  const rawEdgeColor = cssVar("--acheron-text-dim");
  const escalationEdgeColor = tierColor.elevated;
  const activeHopColor = cssVar("--acheron-text");

  const fgRef = useRef<ForceGraphMethods<RenderNode, RenderLink> | undefined>(undefined);
  const hasZoomedToFit = useRef(false);

  // d3-force's default charge (repulsion) force has no falloff distance, so
  // even fully disconnected components keep weakly pushing each other apart
  // for as long as the simulation runs — visibly drifting/reframing for
  // several seconds after load. Capping the range fixes it; a short
  // cooldown makes it settle quickly instead of drifting for the default 15s.
  useEffect(() => {
    const chargeForce = fgRef.current?.d3Force("charge");
    chargeForce?.distanceMax?.(300);
  }, []);

  // Memoized so re-renders driven by the hop-stepping timer (Phase 6) don't
  // hand force-graph a brand-new graphData object every ~1400ms, which
  // would make it treat the graph as new data and reset node positions.
  const nodes: RenderNode[] = useMemo(() => graph.nodes.map((n) => ({ ...n })), [graph.nodes]);
  const links: RenderLink[] = useMemo(
    () => [
      ...graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceId: e.source,
        targetId: e.target,
        type: e.type,
        isEscalation: false,
        label: e.type,
      })),
      ...graph.escalation_edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceId: e.source,
        targetId: e.target,
        type: e.type,
        isEscalation: true,
        label: e.narration,
      })),
    ],
    [graph.edges, graph.escalation_edges],
  );

  return (
    <ForceGraph2D<RenderNode, RenderLink>
      ref={fgRef}
      graphData={{ nodes, links }}
      backgroundColor={backgroundColor}
      autoPauseRedraw={false}
      cooldownTime={4000}
      onEngineStop={() => {
        if (hasZoomedToFit.current) return;
        hasZoomedToFit.current = true;
        fgRef.current?.zoomToFit(600, 60);
      }}
      nodeLabel={(node) => node.display_name}
      nodeColor={(node) => tierColor[node.tier]}
      nodeVal={(node) => NODE_SIZE[node.tier]}
      // Passing a plain string here would be misread by the underlying
      // accessor-fn helper as "look up this field name on each node" (the
      // standard d3-accessor convention), not "use this literal constant" —
      // it'd silently evaluate to undefined for every node and this mode
      // check would never match. Wrapping in a function forces the literal.
      nodeCanvasObjectMode={() => "before"}
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
      linkColor={(link) =>
        isActiveHop(link, activeHop) ? activeHopColor : link.isEscalation ? escalationEdgeColor : rawEdgeColor
      }
      linkWidth={(link) => (isActiveHop(link, activeHop) ? 4 : link.isEscalation ? 2 : 1)}
      linkLineDash={(link) => (link.isEscalation ? [4, 2] : null)}
      linkDirectionalParticles={(link) => (link.isEscalation ? 2 : 0)}
      linkDirectionalParticleWidth={2}
      onNodeClick={(node) => onNodeClick(node.id as string)}
    />
  );
}
