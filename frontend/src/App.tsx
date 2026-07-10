import { useEffect, useMemo, useState } from "react";

import { getGraph, type GraphData } from "./api/client";
import { GraphView } from "./components/GraphView";
import { NarrationPanel } from "./components/NarrationPanel";

const HOP_INTERVAL_MS = 1400;

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hopIndex, setHopIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGraph().then(setGraph).catch((err: Error) => setError(err.message));
  }, []);

  const hopQueue = useMemo(() => {
    if (selectedNodeId === null || graph === null) return [];
    return graph.escalation_edges
      .filter((edge) => edge.source === selectedNodeId)
      .flatMap((edge) => edge.hops);
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
  const activeHop = hopQueue[hopIndex] ?? null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <main style={{ flex: 1, position: "relative" }}>
        {error && <p style={{ color: "var(--tier-global-admin)", padding: 16 }}>{error}</p>}
        {graph && <GraphView graph={graph} activeHop={activeHop} onNodeClick={setSelectedNodeId} />}
      </main>
      <NarrationPanel selectedNodeDisplayName={selectedNodeDisplayName} hopQueue={hopQueue} hopIndex={hopIndex} />
    </div>
  );
}
