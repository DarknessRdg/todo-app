import { useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { ConfettiColors } from "@/lib/confetti";
import { testProp, type TestIdProps } from "@/lib/test-id";

const PiecesPerCannon = 45;

/**
 * Confetti across the whole screen: the reward for getting something out of
 * your head and into the list.
 *
 * Two cannons at the bottom corners fire up and inward, and the paper drifts
 * back down across the page. Each piece is a CSS animation on `transform` and
 * `opacity` only, on a fixed layer that ignores the pointer, so the page under
 * it stays usable while it falls. Render it keyed, so a second capture fires a
 * fresh volley rather than nothing; the caller unmounts it when it is done.
 *
 * Decorative (`aria-hidden`), and gone entirely under reduced motion: there is
 * no still version of a confetti cannon worth showing.
 */
export function ScreenConfetti({ testId }: TestIdProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PiecesPerCannon * 2 }, (_, i) => {
        const fromLeft = i < PiecesPerCannon;
        const side = fromLeft ? 1 : -1;
        // Up and inward from the corner: across 15-55% of the screen width,
        // to a peak 45-85% of the way up.
        const reach = 15 + Math.random() * 40;
        const peak = 45 + Math.random() * 40;

        return {
          left: fromLeft ? "0%" : "100%",
          peakX: `${side * reach}vw`,
          peakY: `${-peak}vh`,
          // Keeps drifting the same way while it falls past where it rose.
          endX: `${side * (reach + 5 + Math.random() * 15)}vw`,
          endY: `${10 - peak * 0.2}vh`,
          rot: `${Math.round((Math.random() - 0.5) * 1080)}deg`,
          color: ConfettiColors[i % ConfettiColors.length],
          delay: `${Math.round(Math.random() * 180)}ms`,
          duration: `${1400 + Math.round(Math.random() * 700)}ms`,
          width: 6 + Math.round(Math.random() * 4),
          height: 9 + Math.round(Math.random() * 6),
          round: Math.random() > 0.75,
        };
      }),
    []
  );

  return createPortal(
    <div
      aria-hidden
      {...testProp(testId)}
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="celebration-piece absolute bottom-0 block"
          style={
            {
              left: piece.left,
              width: piece.width,
              height: piece.round ? piece.width : piece.height,
              backgroundColor: piece.color,
              borderRadius: piece.round ? "9999px" : "2px",
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              "--peak-x": piece.peakX,
              "--peak-y": piece.peakY,
              "--end-x": piece.endX,
              "--end-y": piece.endY,
              "--rot": piece.rot,
            } as CSSProperties
          }
        />
      ))}
    </div>,
    document.body
  );
}
