import { useMemo } from "react";
import type { CSSProperties } from "react";

/**
 * A small one-shot confetti burst. Render it (keyed so it remounts) at the
 * moment of completion; it fires once and is purely decorative (aria-hidden).
 * Colors stay on-system: ink, sage, and grays.
 */

const COLORS = ["var(--color-ink)", "var(--color-sage)", "#a3a3a3", "#737373"];
const PIECES = 14;

export function ConfettiBurst({ className }: { className?: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (Math.PI * 2 * i) / PIECES + Math.random() * 0.5;
        const distance = 26 + Math.random() * 26;
        return {
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          rot: `${Math.round((Math.random() - 0.5) * 540)}deg`,
          color: COLORS[i % COLORS.length],
          delay: `${Math.random() * 40}ms`,
          size: 5 + Math.round(Math.random() * 3),
          round: Math.random() > 0.5,
        };
      }),
    []
  );

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute top-1/2 left-1/2 z-10 ${className ?? ""}`}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute block"
          style={
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.round ? "9999px" : "1px",
              animationDelay: p.delay,
              "--tx": p.tx,
              "--ty": p.ty,
              "--rot": p.rot,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
