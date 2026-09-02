import { sfx } from "../utils/sfx";

type OrbState = "idle" | "listening" | "thinking" | "speaking" | "error";

type OrbControlProps = {
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  state: OrbState;
};

export function OrbControl({ disabled, onStart, onStop, state }: OrbControlProps) {
  const label =
    state === "listening"
      ? "Listening to Ash... Say your command or click to finish"
      : state === "thinking"
      ? "Processing neural directive"
      : state === "speaking"
      ? "Jarvis vocal transmission active"
      : "Say 'Hey Jarvis' or click to talk";

  const handleClick = () => {
    if (disabled) return;
    if (state === "listening") {
      sfx.playLaser();
      onStop();
    } else if (state === "idle" || state === "error") {
      sfx.playPowerUp();
      onStart();
    }
  };

  return (
    <div className={`arc-core-unit state-${state}`}>
      {/* Outer Tactical Reticle Frame */}
      <div className="arc-bracket bracket-tl"></div>
      <div className="arc-bracket bracket-tr"></div>
      <div className="arc-bracket bracket-bl"></div>
      <div className="arc-bracket bracket-br"></div>

      <button
        type="button"
        className="arc-orb-button"
        aria-label={label}
        disabled={disabled}
        onClick={handleClick}
      >
        {/* Multi-layered Animated Arc Reactor Energy Rings */}
        <div className="arc-fx-rings" aria-hidden="true">
          <div className="arc-ring ring-vane-outer"></div>
          <div className="arc-ring ring-tachyon"></div>
          <div className="arc-ring ring-segmented"></div>
          <div className="arc-ring ring-inner-flux"></div>

          {/* Center Holographic Core */}
          <div className="arc-core-emitter">
            <div className="arc-core-plasma"></div>
            {state === "listening" && (
              <div className="arc-wave-bars">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            )}
            {state === "thinking" && <div className="arc-quantum-spin"></div>}
            {state === "speaking" && <div className="arc-voice-pulse"></div>}
            {state === "idle" && <div className="arc-stark-logo">J.A.R.V.I.S.</div>}
          </div>
        </div>

        {/* Dynamic Status Callout Badge */}
        <div className="arc-callout-badge">
          <span className="arc-pulse-dot"></span>
          <span className="arc-label-text">
            {state === "listening"
              ? "🎙️ LISTENING TO ASH • TAP TO SEND"
              : state === "thinking"
              ? "COMPUTING DIRECTIVE…"
              : state === "speaking"
              ? "JARVIS VOCAL SYNTH"
              : state === "error"
              ? "LINK ERROR • TAP TO RETRY"
              : "🎙️ SAY 'HEY JARVIS' OR CLICK"}
          </span>
        </div>
      </button>
    </div>
  );
}
