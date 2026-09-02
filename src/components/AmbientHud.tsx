import type { CSSProperties } from "react";

type AmbientHudProps = { active: boolean; level: number };

const signalLines = Array.from({ length: 32 }, (_, index) => ({
  x: 24 + index * 18,
  height: 25 + ((index * 29) % 85),
  delay: `${(index % 8) * -0.15}s`,
}));

export function AmbientHud({ active, level }: AmbientHudProps) {
  return (
    <div className={`ambient-hud ${active ? "is-active" : ""}`} style={{ "--audio-level": level } as CSSProperties} aria-hidden="true">
      <svg className="signal-field" viewBox="0 0 620 190" preserveAspectRatio="none">
        <path d="M 0 176 Q 310 150 620 176" className="hud-horizon" />
        <circle cx="140" cy="168" r="2.5" className="hud-node" />
        <circle cx="480" cy="168" r="2.5" className="hud-node" />
        <path d="M 140 168 L 110 130 L 40 130" className="hud-circuit" />
        <path d="M 480 168 L 510 130 L 580 130" className="hud-circuit" />
        
        {signalLines.map((line, index) => (
          <line
            className="signal-line"
            key={line.x}
            style={{ "--line-delay": line.delay } as CSSProperties}
            x1={line.x}
            x2={line.x}
            y1="176"
            y2={176 - line.height - (index % 3) * 8}
          />
        ))}
      </svg>
      <div className="hud-caption-wrapper">
        <p className="hud-caption">AUDIO LINK / STANDBY</p>
        <div className="hud-scanline"></div>
      </div>
    </div>
  );
}
