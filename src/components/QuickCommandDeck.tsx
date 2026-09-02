type QuickCommandDeckProps = {
  onAskJarvis: (prompt: string) => void;
};

export function QuickCommandDeck({ onAskJarvis }: QuickCommandDeckProps) {
  const commands = [
    { label: "VS CODE", icon: "⚡", prompt: "Open Visual Studio Code" },
    { label: "NOTEPAD", icon: "📝", prompt: "Open Notepad" },
    { label: "CALCULATOR", icon: "🧮", prompt: "Open Calculator" },
    { label: "EXPLORER", icon: "📁", prompt: "Open File Explorer" },
    { label: "SPOTIFY", icon: "🎵", prompt: "Play Hans Zimmer on Spotify" },
    { label: "YOUTUBE", icon: "📺", prompt: "Play Marvel Iron Man soundtrack on YouTube" },
    { label: "STATUS", icon: "🛡️", prompt: "Give me a full system status report, Jarvis." },
    { label: "WHO AM I?", icon: "👑", prompt: "Who am I and what is my authority, Jarvis?" },
  ];

  return (
    <div className="quick-deck-card">
      <div className="quick-deck-header">
        <span className="deck-badge">ASH COMMAND MATRIX</span>
        <small className="deck-tag">DIRECTIVE DECK</small>
      </div>

      <div className="quick-deck-grid">
        {commands.map((cmd) => (
          <button
            key={cmd.label}
            type="button"
            className="quick-deck-btn"
            onClick={() => onAskJarvis(cmd.prompt)}
          >
            <span className="quick-icon">{cmd.icon}</span>
            <span className="quick-label">{cmd.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
