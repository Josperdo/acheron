import type { Theme } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        background: "transparent",
        border: "1px solid var(--acheron-border)",
        borderRadius: 4,
        color: "var(--acheron-text-dim)",
        fontSize: 14,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
