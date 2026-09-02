import { useState, useEffect } from "react";

export function ArcReactorDiagnostics() {
  const [output, setOutput] = useState(3.24);
  const [temp, setTemp] = useState(4200);
  const [overcharge, setOvercharge] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.5) * 0.08;
      setOutput((prev) => Math.max(2.8, Math.min(4.8, +(prev + delta).toFixed(2))));
      setTemp((prev) => Math.round(prev + (Math.random() - 0.5) * 20));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`arc-reactor-card ${overcharge ? "is-overcharged" : ""}`}>
      <div className="arc-header">
        <span className="arc-badge">MARK VII CORE</span>
        <span className="arc-status-tag">{overcharge ? "OVERCHARGE" : "OPTIMAL"}</span>
      </div>

      <div className="arc-visualizer-container">
        <div className="arc-ring-outer"></div>
        <div className="arc-ring-middle"></div>
        <div className="arc-ring-inner"></div>
        <div className="arc-core-glow">
          <span className="arc-kw">{output}</span>
          <small>GJ/s</small>
        </div>
      </div>

      <div className="arc-metrics">
        <div className="arc-metric-tile">
          <small>CORE TEMP</small>
          <strong>{temp} K</strong>
        </div>
        <div className="arc-metric-tile">
          <small>MAGNETIC FLUX</small>
          <strong>99.8 %</strong>
        </div>
      </div>

      <button
        type="button"
        className="arc-overcharge-btn"
        onClick={() => setOvercharge(!overcharge)}
      >
        {overcharge ? "STABILIZE CORE" : "ENGAGE UNIBEAM FLUX"}
      </button>
    </div>
  );
}
