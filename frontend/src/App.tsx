import { useEffect, useMemo, useState } from "react";

import { getGraph, type EscalationHop, type GraphData, type PrivilegeTier } from "./api/client";
import { BlastRadiusSummary, type BlastRadiusEntry } from "./components/BlastRadiusSummary";
import { GraphView } from "./components/GraphView";
import { Legend } from "./components/Legend";
import { NarrationPanel, type QueuedHop } from "./components/NarrationPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";

const HOP_INTERVAL_MS = 1400;

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hopIndex, setHopIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGraph().then(setGraph).catch((err: Error) => setError(err.message));
  }, []);

  // Shared summary of every escalation edge, ranked shortest-first — one
  // source of truth for "what can reach what, how directly," feeding both
  // the header's blast-radius stat/dropdown and (filtered per-identity)
  // the click-to-trace hop queue below.
  const blastRadiusEntries: BlastRadiusEntry[] = useMemo(() => {
    if (graph === null) return [];
    return graph.escalation_edges
      .map((edge) => {
        const identity = graph.nodes.find((n) => n.id === edge.source);
        const target = graph.nodes.find((n) => n.id === edge.target);
        return {
          identityId: edge.source,
          identityDisplayName: identity?.display_name ?? edge.source,
          targetDisplayName: target?.display_name ?? edge.target,
          targetTier: target?.tier ?? ("standard" as PrivilegeTier),
          hopCount: edge.hops.length,
        };
      })
      .sort((a, b) => a.hopCount - b.hopCount);
  }, [graph]);

  const blastRadius = useMemo(
    () => new Set(blastRadiusEntries.map((e) => e.identityId)).size,
    [blastRadiusEntries],
  );

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
          pathTargetTier: targetNode?.tier ?? "standard",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--acheron-border)",
          background: "var(--acheron-panel-bg)",
          padding: "10px 16px",
          flexShrink: 0,
          position: "relative",
          zIndex: 10,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, letterSpacing: 1 }}>ACHERON</span>
          <span style={{ color: "var(--acheron-text-dim)", fontSize: 13, marginLeft: 10 }}>
            Entra ID Attack Path Visualizer
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {blastRadius > 0 && (
            <BlastRadiusSummary count={blastRadius} entries={blastRadiusEntries} onSelectIdentity={setSelectedNodeId} />
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <main
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: "radial-gradient(ellipse at 50% 35%, var(--acheron-vignette-center) 0%, var(--acheron-bg) 65%)",
          }}
        >
          <Legend />
          {error && <p style={{ color: "var(--tier-global-admin)", padding: 16 }}>{error}</p>}
          {graph && <GraphView graph={graph} activeHop={activeHop} onNodeClick={setSelectedNodeId} theme={theme} />}
        </main>
        <NarrationPanel selectedNodeDisplayName={selectedNodeDisplayName} hopQueue={hopQueue} hopIndex={hopIndex} />
      </div>
    </div>
  );
}
