interface NarrationPanelProps {
  selectedNodeId: string | null;
}

/**
 * Phase 6 placeholder: will narrate an escalation path hop-by-hop as it
 * animates (see app/models/graph_models.py EscalationEdge.narration).
 */
export function NarrationPanel({ selectedNodeId }: NarrationPanelProps) {
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
      {selectedNodeId ? (
        <p>Selected: {selectedNodeId}</p>
      ) : (
        <p style={{ color: "var(--acheron-text-dim)" }}>Click a node to trace its escalation paths.</p>
      )}
    </aside>
  );
}
