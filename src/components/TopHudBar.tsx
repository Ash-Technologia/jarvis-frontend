import { useState, useEffect } from "react";
import { sfx } from "../utils/sfx";

type Telemetry = {
  cpu: number;
  ram_pct: number;
  ram_used: string;
  ram_total: string;
  power: string;
  power_pct: number;
  time: string;
  weather: string;
};

export function TopHudBar() {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    cpu: 12,
    ram_pct: 44,
    ram_used: "7.1 GB",
    ram_total: "16.0 GB",
    power: "AC Power",
    power_pct: 100,
    time: "--:--",
    weather: "22°C Clear",
  });
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/api/telemetry");
        if (res.ok) {
          const data = (await res.json()) as Telemetry;
          setTelemetry(data);
        }
      } catch {}
    }

    void loadTelemetry();
    const interval = setInterval(loadTelemetry, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.enabled = next;
    if (next) sfx.playChirp();
  };

  return (
    <header className="top-hud-bar">
      <div className="top-hud-left">
        <span className="hud-logo-glow">STARK INDUSTRIES</span>
        <span className="hud-operator-badge">OPERATOR: ASH</span>
        <span className="hud-ai-status">J.A.R.V.I.S. v7.4 ONLINE</span>
      </div>

      <div className="top-hud-center">
        <div className="telemetry-pill">
          <small>VOICE</small>
          <strong>🎙️ HEY JARVIS</strong>
        </div>
        <div className="telemetry-pill">
          <small>CPU</small>
          <strong>{telemetry.cpu}%</strong>
        </div>
        <div className="telemetry-pill">
          <small>RAM</small>
          <strong>{telemetry.ram_pct}%</strong>
        </div>
        <div className="telemetry-pill">
          <small>PWR</small>
          <strong>{telemetry.power_pct}%</strong>
        </div>
      </div>

      <div className="top-hud-right">
        <button
          type="button"
          className={`hud-sfx-toggle ${soundOn ? "is-active" : ""}`}
          onClick={toggleSound}
          title="Toggle UI Audio Synthesis"
        >
          {soundOn ? "🔊 SFX ON" : "🔇 SFX OFF"}
        </button>
        <span className="hud-clock">{telemetry.time || "12:00 PM"}</span>
      </div>
    </header>
  );
}
