import type { EscalationHop, PrivilegeTier } from "../api/client";

export interface QueuedHop extends EscalationHop {
  pathIndex: number;
  pathCount: number;
  hopIndexInPath: number;
  hopCountInPath: number;
  pathTargetDisplayName: string;
  pathTargetTier: PrivilegeTier;
}

interface NarrationPanelProps {
  selectedNodeDisplayName: string | null;
  hopQueue: QueuedHop[];
  hopIndex: number;
}

const TIER_ACCENT: Record<PrivilegeTier, string> = {
  standard: "var(--tier-standard)",
  elevated: "var(--tier-elevated)",
  global_admin: "var(--tier-global-admin)",
};

/**
 * Narrates the active click-to-trace escalation path as a numbered,
 * connected stepper (in sync with GraphView's edge highlighting — see
 * App.tsx's hopQueue/hopIndex stepping timer), rather than a flat text
 * list. When an identity has more than one path, each is its own
 * tier-colored group with a "Path N of M" badge, ranked shortest first.
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
          <p style={{ color: "var(--acheron-text-dim)", fontSize: 12, margin: "0 0 16px" }}>
            {activeHop.pathCount > 1 && `Path ${activeHop.pathIndex + 1} of ${activeHop.pathCount} · `}
            Step {activeHop.hopIndexInPath + 1} of {activeHop.hopCountInPath}
          </p>

          {pathGroups.map((group, pathIdx) => {
            const accent = TIER_ACCENT[group[0].pathTargetTier];
            return (
              <div key={pathIdx} style={{ marginBottom: 18 }}>
                {group[0].pathCount > 1 && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: accent,
                      color: "var(--on-accent)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 4,
                      marginBottom: 10,
                    }}
                  >
                    Path {pathIdx + 1} of {group[0].pathCount} · {group[0].hopCountInPath} hops · via{" "}
                    {group[0].pathTargetDisplayName}
                  </div>
                )}

                {group.map((hop, i) => {
                  const isActive = hop.pathIndex === activeHop.pathIndex && hop.hopIndexInPath === activeHop.hopIndexInPath;
                  const isCompleted =
                    hop.pathIndex < activeHop.pathIndex ||
                    (hop.pathIndex === activeHop.pathIndex && hop.hopIndexInPath <= activeHop.hopIndexInPath);
                  const isLast = i === group.length - 1;
                  const markerColor = isCompleted ? accent : "var(--acheron-border)";

                  return (
                    <div key={i} style={{ display: "flex", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 22, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                            background: isCompleted ? markerColor : "transparent",
                            border: `2px solid ${markerColor}`,
                            color: isCompleted ? "var(--on-accent)" : "var(--acheron-text-dim)",
                            boxShadow: isActive ? `0 0 8px ${accent}` : "none",
                          }}
                        >
                          {i + 1}
                        </div>
                        {!isLast && (
                          <div style={{ width: 2, flex: 1, minHeight: 16, background: markerColor, marginTop: 2 }} />
                        )}
                      </div>
                      <div
                        style={{
                          paddingBottom: 14,
                          fontSize: 13,
                          lineHeight: 1.4,
                          opacity: isCompleted ? 1 : 0.4,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--acheron-text)" : "inherit",
                        }}
                      >
                        {hop.narration}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </aside>
  );
}
