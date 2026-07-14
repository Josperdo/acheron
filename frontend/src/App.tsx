import { useEffect, useMemo, useState } from "react";

import { getGraph, type EscalationHop, type GraphData } from "./api/client";
import { GraphView } from "./components/GraphView";
import { Legend } from "./components/Legend";
import { NarrationPanel, type QueuedHop } from "./components/NarrationPanel";

const HOP_INTERVAL_MS = 1400;

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hopIndex, setHopIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGraph().then(setGraph).catch((err: Error) => setError(err.message));
  }, []);

  // Ranked, path-aware hop queue: an identity can have more than one
  // escalation path (see fixtures/synthetic_tenant.json — alice has two).
  // Ranking by hop-count (shortest/most-direct first) is the actual
  // "graph-algorithm depth" ask — the stepping timer below is unchanged,
  // it just walks whatever flat array this produces.
  const hopQueue: QueuedHop[] = useMemo(() => {
    if (selectedNodeId === null || graph === null) return [];

    const matchingPaths = graph.escalation_edges
      .filter((edge) => edge.source === selectedNodeId)
      .slice()
      .sort((a, b) => a.hops.length - b.hops.length);

    return matchingPaths.flatMap((path, pathIndex) => {
      const targetNode = graph.nodes.find((n) => n.id === path.target);
      return path.hops.map(
        (hop, hopIndexInPath): QueuedHop => ({
          ...hop,
          pathIndex,
          pathCount: matchingPaths.length,
          hopIndexInPath,
          hopCountInPath: path.hops.length,
          pathTargetDisplayName: targetNode?.display_name ?? path.target,
        }),
      );
    });
  }, [selectedNodeId, graph]);

  useEffect(() => {
    setHopIndex(0);
    if (hopQueue.length === 0) return;

    const id = setInterval(() => {
      setHopIndex((i) => {
        if (i + 1 >= hopQueue.length) {
          clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, HOP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [hopQueue]);

  const selectedNodeDisplayName =
    selectedNodeId === null ? null : (graph?.nodes.find((n) => n.id === selectedNodeId)?.display_name ?? selectedNodeId);
  const activeHop: EscalationHop | null = hopQueue[hopIndex] ?? null;

  // "Blast radius" — distinct identities with at least one escalation
  // path. Computed client-side from data already in the /graph response;
  // no backend change needed.
  const blastRadius = useMemo(() => {
    if (graph === null) return null;
    return new Set(graph.escalation_edges.map((e) => e.source)).size;
  }, [graph]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--acheron-border)",
          background: "var(--acheron-panel-bg)",
          padding: "10px 16px",
          flexShrink: 0,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, letterSpacing: 1 }}>ACHERON</span>
          <span style={{ color: "var(--acheron-text-dim)", fontSize: 13, marginLeft: 10 }}>
            Entra ID Attack Path Visualizer
          </span>
        </div>
        {blastRadius !== null && blastRadius > 0 && (
          <span style={{ color: "var(--tier-elevated)", fontSize: 13, fontWeight: 600 }}>
            ⚠ {blastRadius} identit{blastRadius === 1 ? "y" : "ies"} can reach a privileged role
          </span>
        )}
      </header>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <main style={{ flex: 1, position: "relative" }}>
          <Legend />
          {error && <p style={{ color: "var(--tier-global-admin)", padding: 16 }}>{error}</p>}
          {graph && <GraphView graph={graph} activeHop={activeHop} onNodeClick={setSelectedNodeId} />}
        </main>
        <NarrationPanel selectedNodeDisplayName={selectedNodeDisplayName} hopQueue={hopQueue} hopIndex={hopIndex} />
      </div>
    </div>
  );
}
