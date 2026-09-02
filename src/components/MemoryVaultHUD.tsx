import { useState, useEffect, FormEvent } from "react";
import { sfx } from "../utils/sfx";

export function MemoryVaultHUD() {
  const [memoryInput, setMemoryInput] = useState("");
  const [memories, setMemories] = useState<string[]>([
    "Primary Operator: Ash (Full Clearance Level 10)",
    "Protocol: Arc Reactor Core Mark VII Online",
    "Security Directive: Autonomous threat assessment active",
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMemories() {
      try {
        const res = await fetch("/api/memory/all");
        if (res.ok) {
          const data = await res.json() as { memories?: { text?: string }[] };
          if (data.memories && data.memories.length > 0) {
            const list = data.memories.map((m) => m.text || "").filter(Boolean);
            if (list.length > 0) {
              setMemories(list.slice(0, 5));
            }
          }
        }
      } catch {}
    }
    void loadMemories();
  }, []);

  const handleAddMemory = async (e: FormEvent) => {
    e.preventDefault();
    if (!memoryInput.trim() || saving) return;

    setSaving(true);
    sfx.playChirp();
    try {
      const form = new FormData();
      form.append("text", memoryInput.trim());
      const res = await fetch("/api/memory/add", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setMemories((prev) => [memoryInput.trim(), ...prev.slice(0, 4)]);
        setMemoryInput("");
        sfx.playLaser();
      }
    } catch {
      setMemories((prev) => [memoryInput.trim(), ...prev.slice(0, 4)]);
      setMemoryInput("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="memory-vault-card">
      <div className="memory-header">
        <span className="memory-badge">NEURAL MEMORY VAULT</span>
        <small className="memory-sync">VECTOR SYNCED</small>
      </div>

      <div className="memory-list">
        {memories.map((m, idx) => (
          <div key={idx} className="memory-item">
            <span className="memory-dot"></span>
            <p className="memory-text">{m}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddMemory} className="memory-form">
        <input
          type="text"
          value={memoryInput}
          onChange={(e) => setMemoryInput(e.target.value)}
          placeholder="Store memory for Ash…"
          disabled={saving}
          className="memory-input"
        />
        <button type="submit" disabled={!memoryInput.trim() || saving} className="memory-add-btn">
          {saving ? "…" : "SAVE"}
        </button>
      </form>
    </div>
  );
}
