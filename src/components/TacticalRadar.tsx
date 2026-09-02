import { useState, useEffect } from "react";

export function TacticalRadar() {
  const [blips, setBlips] = useState([
    { id: 1, x: 35, y: 40, label: "SAT-LINK 07", alert: false },
    { id: 2, x: 70, y: 25, label: "ASH WORKSTATION", alert: false },
    { id: 3, x: 60, y: 75, label: "LOCAL PERIMETER", alert: true },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlips((prev) =>
        prev.map((b) => ({
          ...b,
          x: Math.max(15, Math.min(85, b.x + (Math.random() - 0.5) * 4)),
          y: Math.max(15, Math.min(85, b.y + (Math.random() - 0.5) * 4)),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tactical-radar-card">
      <div className="radar-header">
        <span className="radar-badge">TACTICAL PERIMETER</span>
        <span className="radar-threat-level">DEFCON 1 • SECURE</span>
      </div>

      <div className="radar-display">
        <div className="radar-sweep"></div>
        <div className="radar-cross-x"></div>
        <div className="radar-cross-y"></div>
        <div className="radar-circle-1"></div>
        <div className="radar-circle-2"></div>
        <div className="radar-circle-3"></div>

        {blips.map((b) => (
          <div
            key={b.id}
            className={`radar-blip ${b.alert ? "is-alert" : ""}`}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span className="blip-dot"></span>
            <span className="blip-label">{b.label}</span>
          </div>
        ))}
      </div>

      <div className="radar-telemetry-row">
        <span>SATELLITE SYNC: 100%</span>
        <span>DRONE RECON: ACTIVE</span>
      </div>
    </div>
  );
}
