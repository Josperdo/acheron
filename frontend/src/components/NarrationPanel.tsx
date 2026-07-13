import type { EscalationHop } from "../api/client";

interface NarrationPanelProps {
  selectedNodeDisplayName: string | null;
  hopQueue: EscalationHop[];
  hopIndex: number;
}

/**
 * Narrates the active click-to-trace escalation path hop-by-hop, in sync
 * with GraphView's edge highlighting (see App.tsx's hopQueue/hopIndex
 * stepping timer).
 */
export function NarrationPanel({ selectedNodeDisplayName, hopQueue, hopIndex }: NarrationPanelProps) {
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

      {selectedNodeDisplayName !== null && hopQueue.length > 0 && (
        <>
          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{selectedNodeDisplayName}</p>
          <p style={{ color: "var(--acheron-text-dim)", fontSize: 12, margin: "0 0 12px" }}>
            Step {hopIndex + 1} of {hopQueue.length}
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {hopQueue.map((hop, i) => (
              <li
                key={i}
                style={{
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--acheron-border)",
                  fontSize: 13,
                  lineHeight: 1.4,
                  opacity: i <= hopIndex ? 1 : 0.35,
                  fontWeight: i === hopIndex ? 600 : 400,
                  color: i === hopIndex ? "var(--acheron-text)" : "inherit",
                }}
              >
                {hop.narration}
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}
