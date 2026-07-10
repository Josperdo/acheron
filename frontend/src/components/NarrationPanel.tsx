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
        borderLeft: "1px solid var(--acheron-border)",
        background: "var(--acheron-panel-bg)",
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 14, textTransform: "uppercase", color: "var(--acheron-text-dim)" }}>
        Narration
      </h2>
      {selectedNodeDisplayName === null && (
        <p style={{ color: "var(--acheron-text-dim)" }}>Click a node to trace its escalation paths.</p>
      )}
      {selectedNodeDisplayName !== null && hopQueue.length === 0 && (
        <p style={{ color: "var(--acheron-text-dim)" }}>
          No known escalation path from {selectedNodeDisplayName}.
        </p>
      )}
      {selectedNodeDisplayName !== null && hopQueue.length > 0 && (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {hopQueue.map((hop, i) => (
            <li
              key={i}
              style={{
                padding: "8px 0",
                opacity: i <= hopIndex ? 1 : 0.35,
                fontWeight: i === hopIndex ? 600 : 400,
              }}
            >
              {hop.narration}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
