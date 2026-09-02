// Continuous Background Wake Word Detection ("Hey Jarvis" / "Jarvis")

export class WakeWordListener {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private isListening = false;
  private onWakeWord: (command?: string) => void;
  private lastTriggerTime = 0;
  public enabled = true;

  constructor(onWakeWord: (command?: string) => void) {
    this.onWakeWord = onWakeWord;
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        if (!this.enabled) return;
        const now = Date.now();
        if (now - this.lastTriggerTime < 2000) return; // Debounce rapid triggers

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();

          if (transcript.includes("hey jarvis") || transcript.includes("jarvis") || transcript.includes("hi jarvis")) {
            this.lastTriggerTime = now;
            let command = "";
            const match = transcript.match(/(?:hey\s+|hi\s+)?jarvis[\s,.]*(.*)/i);
            if (match && match[1]) {
              command = match[1].trim();
            }
            this.onWakeWord(command);
            break;
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onerror = (e: any) => {
        if (e.error !== "not-allowed" && this.isListening && this.enabled) {
          setTimeout(() => this.start(), 1500);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening && this.enabled) {
          setTimeout(() => this.start(), 800);
        }
      };
    } catch {}
  }

  public start() {
    if (!this.recognition || !this.enabled) return;
    try {
      this.isListening = true;
      this.recognition.start();
    } catch {}
  }

  public stop() {
    this.isListening = false;
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {}
  }
}
