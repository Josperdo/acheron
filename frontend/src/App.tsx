import { useEffect, useState } from "react";

import { getGraph, type GraphData } from "./api/client";
import { GraphView } from "./components/GraphView";
import { NarrationPanel } from "./components/NarrationPanel";

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGraph().then(setGraph).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <main style={{ flex: 1, position: "relative" }}>
        {error && <p style={{ color: "var(--tier-global-admin)", padding: 16 }}>{error}</p>}
        {graph && <GraphView graph={graph} onNodeClick={setSelectedNodeId} />}
      </main>
      <NarrationPanel selectedNodeId={selectedNodeId} />
    </div>
  );
}
