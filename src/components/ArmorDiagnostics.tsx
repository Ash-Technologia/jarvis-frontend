import { useState } from "react";
import { sfx } from "../utils/sfx";

type Subsystem = {
  id: string;
  name: string;
  status: "OPTIMAL" | "ENGAGED" | "STANDBY";
  integrity: number;
};

export function ArmorDiagnostics() {
  const [subsystems, setSubsystems] = useState<Subsystem[]>([
    { id: "hud", name: "HELMET RETICLE HUD", status: "OPTIMAL", integrity: 100 },
    { id: "repulsor", name: "FLIGHT REPULSORS", status: "ENGAGED", integrity: 98 },
    { id: "unibeam", name: "UNIBEAM CHAMBER", status: "OPTIMAL", integrity: 100 },
    { id: "armor", name: "VIBRANIUM ALLOY", status: "OPTIMAL", integrity: 96 },
    { id: "thruster", name: "BOOT THRUSTERS", status: "STANDBY", integrity: 100 },
  ]);

  const calibrateSystems = () => {
    sfx.playPowerUp();
    setSubsystems((prev) =>
      prev.map((s) => ({
        ...s,
        integrity: 100,
        status: "OPTIMAL",
      }))
    );
  };

  return (
    <div className="armor-card">
      <div className="armor-header">
        <span className="armor-badge">MARK VII ARMOR</span>
        <button type="button" className="armor-calibrate-btn" onClick={calibrateSystems}>
          RE-CALIBRATE
        </button>
      </div>

      <div className="armor-list">
        {subsystems.map((s) => (
          <div key={s.id} className="armor-row">
            <div className="armor-row-info">
              <span className="armor-row-name">{s.name}</span>
              <span className={`armor-row-status ${s.status === "ENGAGED" ? "is-engaged" : ""}`}>
                {s.status}
              </span>
            </div>
            <div className="armor-bar-track">
              <div className="armor-bar-fill" style={{ width: `${s.integrity}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
