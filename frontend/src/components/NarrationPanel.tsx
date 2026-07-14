import type { EscalationHop } from "../api/client";

export interface QueuedHop extends EscalationHop {
  pathIndex: number;
  pathCount: number;
  hopIndexInPath: number;
  hopCountInPath: number;
  pathTargetDisplayName: string;
}

interface NarrationPanelProps {
  selectedNodeDisplayName: string | null;
  hopQueue: QueuedHop[];
  hopIndex: number;
}

/**
 * Narrates the active click-to-trace escalation path hop-by-hop, in sync
 * with GraphView's edge highlighting (see App.tsx's hopQueue/hopIndex
 * stepping timer). When an identity has more than one escalation path
 * (App.tsx ranks them shortest/most-direct first), hops are grouped under
 * a "Path N of M" header per path rather than shown as one flat list.
 */
export function NarrationPanel({ selectedNodeDisplayName, hopQueue, hopIndex }: NarrationPanelProps) {
  const activeHop = hopQueue[hopIndex] ?? null;

  // hopQueue is built path-by-path (see App.tsx), so hops for the same
  // path are already contiguous — grouping is just a partition, not a sort.
  const pathGroups: QueuedHop[][] = [];
  for (const hop of hopQueue) {
    (pathGroups[hop.pathIndex] ??= []).push(hop);
  }

  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: "1px solid var(--acheron-border)",
        background: "var(--acheron-panel-bg)",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--acheron-text-dim)",
          margin: "0 0 12px",
        }}
      >
        Narration
      </h2>

      {selectedNodeDisplayName === null && (
        <p style={{ color: "var(--acheron-text-dim)", fontSize: 13 }}>
          Click a node to trace its escalation paths.
        </p>
      )}

      {selectedNodeDisplayName !== null && hopQueue.length === 0 && (
        <>
          <p style={{ fontWeight: 600, margin: "0 0 6px" }}>{selectedNodeDisplayName}</p>
          <p style={{ color: "var(--acheron-text-dim)", fontSize: 13 }}>No known escalation path.</p>
        </>
      )}

      {selectedNodeDisplayName !== null && hopQueue.length > 0 && activeHop && (
        <>
          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{selectedNodeDisplayName}</p>
          <p style={{ color: "var(--acheron-text-dim)", fontSize: 12, margin: "0 0 12px" }}>
            {activeHop.pathCount > 1 && `Path ${activeHop.pathIndex + 1} of ${activeHop.pathCount} · `}
            Step {activeHop.hopIndexInPath + 1} of {activeHop.hopCountInPath}
          </p>

          {pathGroups.map((group, pathIdx) => (
            <div key={pathIdx} style={{ marginBottom: 12 }}>
              {group[0].pathCount > 1 && (
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color: "var(--acheron-text-dim)",
                    margin: "0 0 4px",
                  }}
                >
                  Path {pathIdx + 1} of {group[0].pathCount} — {group[0].hopCountInPath} hops, via{" "}
                  {group[0].pathTargetDisplayName}
                </p>
              )}
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {group.map((hop, i) => {
                  const isActive = hop.pathIndex === activeHop.pathIndex && hop.hopIndexInPath === activeHop.hopIndexInPath;
                  const isCompleted =
                    hop.pathIndex < activeHop.pathIndex ||
                    (hop.pathIndex === activeHop.pathIndex && hop.hopIndexInPath <= activeHop.hopIndexInPath);
                  return (
                    <li
                      key={i}
                      style={{
                        padding: "8px 0",
                        borderTop: i === 0 ? "none" : "1px solid var(--acheron-border)",
                        fontSize: 13,
                        lineHeight: 1.4,
                        opacity: isCompleted ? 1 : 0.35,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "var(--acheron-text)" : "inherit",
                      }}
                    >
                      {hop.narration}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
