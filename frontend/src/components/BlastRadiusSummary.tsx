import { useState } from "react";

import type { PrivilegeTier } from "../api/client";

export interface BlastRadiusEntry {
  identityId: string;
  identityDisplayName: string;
  targetDisplayName: string;
  targetTier: PrivilegeTier;
  hopCount: number;
}

interface BlastRadiusSummaryProps {
  count: number;
  entries: BlastRadiusEntry[];
  onSelectIdentity: (identityId: string) => void;
}

const TIER_COLOR_VAR: Record<PrivilegeTier, string> = {
  standard: "var(--tier-standard)",
  elevated: "var(--tier-elevated)",
  global_admin: "var(--tier-global-admin)",
};

/**
 * Turns the header's static blast-radius count into an interactive
 * dropdown listing every escalation path (ranked shortest-first, same
 * ordering App.tsx uses for the click-to-trace queue). Clicking a row
 * selects that identity, cross-linking the summary with the graph and
 * NarrationPanel instead of it being a dead-end stat.
 */
export function BlastRadiusSummary({ count, entries, onSelectIdentity }: BlastRadiusSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "1px solid var(--tier-elevated)",
          borderRadius: 4,
          color: "var(--tier-elevated)",
          fontSize: 13,
          fontWeight: 600,
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ⚠ {count} identit{count === 1 ? "y" : "ies"} can reach a privileged role
        <span style={{ fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 15 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              width: 340,
              background: "var(--acheron-panel-bg)",
              border: "1px solid var(--acheron-border)",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            {entries.map((entry, i) => (
              <button
                key={`${entry.identityId}-${entry.targetDisplayName}`}
                onClick={() => {
                  onSelectIdentity(entry.identityId);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderTop: i === 0 ? "none" : "1px solid var(--acheron-border)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  color: "var(--acheron-text)",
                }}
              >
                <span style={{ fontSize: 12.5 }}>
                  {entry.identityDisplayName}
                  <span style={{ color: "var(--acheron-text-dim)" }}> → </span>
                  {entry.targetDisplayName}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 3,
                    color: "var(--on-accent)",
                    background: TIER_COLOR_VAR[entry.targetTier],
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {entry.hopCount} hops
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
