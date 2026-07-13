import type { ReactNode } from "react";

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        marginRight: 8,
      }}
    />
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", fontSize: 12, padding: "3px 0" }}>{children}</div>;
}

/**
 * Static color/style key for the graph. Plain HTML overlay, not canvas —
 * unlike GraphView's canvas rendering, real DOM elements can read CSS
 * `var(--x)` custom properties directly, no getComputedStyle resolution
 * needed here.
 */
export function Legend() {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        background: "var(--acheron-panel-bg)",
        border: "1px solid var(--acheron-border)",
        borderRadius: 6,
        padding: "10px 12px",
        color: "var(--acheron-text-dim)",
      }}
    >
      <Row>
        <Dot color="var(--tier-standard)" />
        Standard
      </Row>
      <Row>
        <Dot color="var(--tier-elevated)" />
        Elevated
      </Row>
      <Row>
        <Dot color="var(--tier-global-admin)" />
        Global Admin
      </Row>
      <div style={{ height: 1, background: "var(--acheron-border)", margin: "6px 0" }} />
      <Row>
        <span style={{ display: "inline-block", width: 16, height: 0, borderTop: "1px solid var(--acheron-border)", marginRight: 8 }} />
        Permission
      </Row>
      <Row>
        <span
          style={{
            display: "inline-block",
            width: 16,
            height: 0,
            borderTop: "2px dashed var(--tier-elevated)",
            marginRight: 8,
          }}
        />
        Escalation path
      </Row>
    </div>
  );
}
