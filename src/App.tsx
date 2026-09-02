import { FormEvent, useEffect, useRef, useState } from "react";
import { sendChatMessage } from "./api/chat";
import { fetchVoices, requestSpeech, transcribeRecording, Voice } from "./api/speech";
import { AmbientHud } from "./components/AmbientHud";
import { ActivityMonitor } from "./components/ActivityMonitor";
import { ArcReactorDiagnostics } from "./components/ArcReactorDiagnostics";
import { TacticalRadar } from "./components/TacticalRadar";
import { QuickCommandDeck } from "./components/QuickCommandDeck";
import { ArmorDiagnostics } from "./components/ArmorDiagnostics";
import { MemoryVaultHUD } from "./components/MemoryVaultHUD";
import { TopHudBar } from "./components/TopHudBar";
import { ComponentState, SystemStatus } from "./components/SystemStatus";
import { BriefingPanel } from "./components/BriefingPanel";
import { OrbControl } from "./components/OrbControl";
import { waitForBackend } from "./api/system";
import { isWebActionRequest, planWebAction, WebAction } from "./webActions";
import { executeLocalAction, getLocalActionStatus, isLocalActionRequest, LocalAction, planLocalAction } from "./localActions";
import { DEMO_MODE } from "./config/mode";
import { sfx } from "./utils/sfx";
import { WakeWordListener } from "./utils/wakeWord";
import cyberpunkBackgroundVideo from "./assets/Animate_background_for_web_inter…_202609011657.mp4";

type Message = { author: "user" | "jarvis"; text: string };
type Status = "idle" | "listening" | "thinking" | "speaking" | "error";
type PendingAction =
  | { type: "web"; action: WebAction }
  | { type: "local"; action: LocalAction };

export function App() {
  const sessionId = useRef(crypto.randomUUID());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const wakeWordRef = useRef<WakeWordListener | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("en-US-GuyNeural");
  const [level, setLevel] = useState(0);
  const [backendState, setBackendState] = useState<ComponentState>("unknown");
  const [backendStarting, setBackendStarting] = useState(!DEMO_MODE);
  const [microphoneState, setMicrophoneState] = useState<ComponentState>("unknown");
  const [sttState, setSttState] = useState<ComponentState>("unknown");
  const [ttsState, setTtsState] = useState<ComponentState>("unknown");
  const [chatState, setChatState] = useState<ComponentState>("unknown");
  const [localActionsState, setLocalActionsState] = useState<ComponentState>("unknown");
  const [localActionsEnabled, setLocalActionsEnabled] = useState(false);
  const [networkState, setNetworkState] = useState<ComponentState>(() => (navigator.onLine ? "ready" : "error"));
  const [bluetoothState, setBluetoothState] = useState<ComponentState>(() => ("bluetooth" in navigator ? "ready" : "unknown"));
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleOnline = () => setNetworkState("ready");
    const handleOffline = () => setNetworkState("error");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setMicrophoneState("error");
      return;
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const hasMic = devices.some((device) => device.kind === "audioinput");
        setMicrophoneState(hasMic ? "ready" : "error");
      })
      .catch(() => setMicrophoneState("error"));
  }, []);

  useEffect(() => {
    let unmounted = false;
    async function loadVoices() {
      try {
        const available = await fetchVoices();
        if (unmounted) return;
        setVoices(available);
        if (available.length) setVoiceId(available[0].id);
        setTtsState("ready");
      } catch {
        if (!unmounted) setTtsState("error");
      }
    }
    void loadVoices();
    return () => {
      unmounted = true;
    };
  }, []);

  useEffect(() => {
    let unmounted = false;
    async function initBackend() {
      if (DEMO_MODE) {
        setBackendState("ready");
        setBackendStarting(false);
        setSttState("ready");
        setTtsState("ready");
        setChatState("ready");
        setLocalActionsState("unknown");
        return;
      }
      setBackendStarting(true);
      const isReady = await waitForBackend();
      if (unmounted) return;
      if (isReady) {
        setBackendState("ready");
        setBackendStarting(false);
        setSttState("ready");
        setTtsState("ready");
        setChatState("ready");
        const localStatus = await getLocalActionStatus().catch(() => false);
        if (unmounted) return;
        setLocalActionsEnabled(localStatus);
        setLocalActionsState(localStatus ? "ready" : "unknown");
      } else {
        setBackendState("error");
        setBackendStarting(false);
        setSttState("error");
        setTtsState("error");
        setChatState("error");
        setLocalActionsState("error");
      }
    }
    void initBackend();
    return () => {
      unmounted = true;
    };
  }, []);

  // Initialize Continuous Wake Word Engine ("Hey Jarvis")
  useEffect(() => {
    wakeWordRef.current = new WakeWordListener((command) => {
      sfx.playPowerUp();
      if (command && command.trim().length > 1) {
        void askJarvis(command.trim());
      } else {
        // User said "Hey Jarvis" - automatically open microphone stream to record command!
        void startListening();
      }
    });

    wakeWordRef.current.start();
    return () => {
      wakeWordRef.current?.stop();
    };
  }, []);

  function stopSpeech() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function stopCapture() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setLevel(0);
  }

  function speakWithBrowserSpeech(text: string) {
    if (!("speechSynthesis" in window)) {
      setStatus("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
      setTtsState("ready");
      setStatus("speaking");
    };
    utterance.onend = () => {
      setStatus("idle");
    };
    utterance.onerror = () => {
      setStatus("idle");
    };
    window.speechSynthesis.speak(utterance);
  }

  async function playSpeech(text: string) {
    if (DEMO_MODE) {
      speakWithBrowserSpeech(text);
      return;
    }
    try {
      stopSpeech();
      const url = URL.createObjectURL(await requestSpeech(text, voiceId));
      const audio = new Audio(url);
      audioRef.current = audio;
      audioUrlRef.current = url;
      audio.onended = () => {
        if (audioUrlRef.current === url) URL.revokeObjectURL(url);
        setStatus("idle");
      };
      await audio.play();
      setTtsState("ready");
      setStatus("speaking");
    } catch (reason) {
      setTtsState("error");
      setError(reason instanceof Error ? reason.message : "Speech generation is unavailable. The text reply is still available.");
      setStatus("idle");
    }
  }

  async function askJarvis(text: string) {
    sfx.playChirp();
    stopSpeech();
    setError("");
    setPendingAction(null);
    setMessages((current) => [...current, { author: "user", text }]);

    if (DEMO_MODE) {
      if (isLocalActionRequest(text)) {
        const reply = "Local app actions will be connected to the backend on Day 2.";
        setMessages((current) => [...current, { author: "jarvis", text: reply }]);
        setStatus("idle");
        void playSpeech(reply);
        return;
      }
      if (isWebActionRequest(text)) {
        const reply = "Web actions will be connected to the backend on Day 2.";
        setMessages((current) => [...current, { author: "jarvis", text: reply }]);
        setStatus("idle");
        void playSpeech(reply);
        return;
      }
      setStatus("thinking");
      try {
        const result = await sendChatMessage(sessionId.current, text);
        setChatState("ready");
        setMessages((current) => [...current, { author: "jarvis", text: result.reply }]);
        void playSpeech(result.reply);
      } catch (reason) {
        setChatState("error");
        setError(reason instanceof Error ? reason.message : "Jarvis could not process that message.");
        setStatus("error");
      }
      return;
    }

    if (isLocalActionRequest(text)) {
      setStatus("thinking");
      try {
        const localAction = await planLocalAction(text);
        setPendingAction({ type: "local", action: localAction });
        setStatus("idle");
      } catch (reason) {
        setLocalActionsState("error");
        setError(reason instanceof Error ? reason.message : "Jarvis could not prepare that local application.");
        setStatus("error");
      }
      return;
    }

    if (isWebActionRequest(text)) {
      setStatus("thinking");
      try {
        const webAction = await planWebAction(text);
        setPendingAction({ type: "web", action: webAction });
        setStatus("idle");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Jarvis could not prepare that web action.");
        setStatus("error");
      }
      return;
    }

    setStatus("thinking");
    try {
      const result = await sendChatMessage(sessionId.current, text);
      setChatState("ready");
      setMessages((current) => [...current, { author: "jarvis", text: result.reply }]);
      void playSpeech(result.reply);
    } catch (reason) {
      setChatState("error");
      setError(reason instanceof Error ? reason.message : "Jarvis could not process that message.");
      setStatus("error");
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    sfx.playLaser();
    const currentAction = pendingAction;
    setPendingAction(null);

    if (currentAction.type === "web") {
      window.open(currentAction.action.url, "_blank", "noopener,noreferrer");
      const reply = `Opening ${currentAction.action.label}.`;
      setMessages((current) => [...current, { author: "jarvis", text: reply }]);
      setStatus("idle");
      void playSpeech(reply);
      return;
    }

    if (currentAction.type === "local") {
      setStatus("thinking");
      try {
        const result = await executeLocalAction(currentAction.action.appId);
        setMessages((current) => [...current, { author: "jarvis", text: result.message }]);
        setLocalActionsState("ready");
        setStatus("idle");
        void playSpeech(result.message);
      } catch (reason) {
        setLocalActionsState("error");
        setError(reason instanceof Error ? reason.message : "Jarvis could not open that local application.");
        setStatus("error");
      }
    }
  }

  function cancelAction() {
    sfx.playBeep(400, 0.1);
    setPendingAction(null);
    const reply = "Action cancelled.";
    setMessages((current) => [...current, { author: "jarvis", text: reply }]);
    setStatus("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || status === "thinking" || backendStarting) return;
    setInput("");
    await askJarvis(text);
  }

  async function startListening() {
    if (status === "thinking" || backendStarting || recorderRef.current) return;
    sfx.playBeep(880, 0.05);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser does not support microphone recording. Text chat remains available.");
      return;
    }
    try {
      setError("");
      stopSpeech();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      setMicrophoneState("ready");
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, curr) => acc + curr, 0);
        const average = sum / dataArray.length;
        setLevel(Math.min(1, average / 80));
        animationRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        recorderRef.current = null;
        const duration = performance.now() - recordingStartedAtRef.current;
        stopCapture();
        if (duration < 650) {
          setError("Recording was too brief. Say 'Hey Jarvis' or click to speak.");
          setSttState("error");
          setStatus("error");
          return;
        }

        if (DEMO_MODE) {
          const demoNotice = "Voice transcription will be connected on Day 2.";
          setMessages((current) => [
            ...current,
            { author: "jarvis", text: demoNotice },
          ]);
          setSttState("ready");
          setStatus("idle");
          void playSpeech(demoNotice);
          return;
        }

        void (async () => {
          try {
            setStatus("thinking");
            const transcript = await transcribeRecording(new Blob(chunks, { type: "audio/webm" }));
            if (!transcript) throw new Error("No speech was detected. Please try again.");
            setSttState("ready");
            await askJarvis(transcript);
          } catch (reason) {
            setSttState("error");
            setError(reason instanceof Error ? reason.message : "Jarvis could not transcribe that recording.");
            setStatus("error");
          }
        })();
      };
      recorder.start();
      recordingStartedAtRef.current = performance.now();
      setStatus("listening");
    } catch (reason) {
      stopCapture();
      setMicrophoneState("error");
      setError(
        reason instanceof Error && reason.name === "NotAllowedError"
          ? "Microphone permission was denied. Text chat remains available."
          : "Jarvis could not access the microphone."
      );
      setStatus("error");
    }
  }

  function finishListening() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const active = status === "listening" || status === "thinking" || status === "speaking";
  const stateLabel = backendStarting
    ? "STARTING LOCAL BACKEND"
    : status === "listening"
    ? "LISTENING / TAP OR SPEAK"
    : status === "thinking"
    ? "PROCESSING COMMAND"
    : status === "speaking"
    ? "VOICE OUTPUT ACTIVE"
    : "🎙️ 'HEY JARVIS' ARMED & READY";

  const statusItems = [
    { label: "BACKEND", state: backendState, detail: DEMO_MODE ? "DEMO MODE" : backendState === "ready" ? "ONLINE" : undefined },
    { label: "NETWORK", state: networkState, detail: networkState === "ready" ? "ONLINE" : "OFFLINE" },
    { label: "TEXT ENGINE", state: chatState },
    { label: "BLUETOOTH", state: bluetoothState, detail: bluetoothState === "ready" ? "AVAILABLE" : undefined },
    { label: "MICROPHONE", state: microphoneState },
    { label: "SPEECH TO TEXT", state: sttState },
    { label: "TEXT TO SPEECH", state: ttsState },
    { label: "LOCAL ACTIONS", state: localActionsState, detail: DEMO_MODE ? "DAY 2" : localActionsEnabled ? "READY" : "DISABLED" },
  ];

  return (
    <main className="app-shell">
      <video className="background-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src={cyberpunkBackgroundVideo} type="video/mp4" />
      </video>
      <AmbientHud active={active} level={status === "listening" ? level : status === "speaking" ? 0.72 : 0.35} />

      {/* FIXED TOP HUD STATUS BAR */}
      <TopHudBar />

      {/* COCKPIT STRUCTURED 3-COLUMN LAYOUT */}
      <div className="cockpit-container">
        {/* LEFT COLUMN: ACTIVITY, SYSTEM METRICS & BRIEFING */}
        <aside className="cockpit-col-left">
          <ActivityMonitor state={status} />
          <SystemStatus items={statusItems} />
          <BriefingPanel />
        </aside>

        {/* CENTER COLUMN: TACTICAL RADAR, ORB, COMMAND MATRIX */}
        <section className="cockpit-col-center">
          <TacticalRadar />
          <div className="orb-slot">
            <OrbControl
              disabled={status === "thinking" || backendStarting}
              state={status}
              onStart={() => void startListening()}
              onStop={finishListening}
            />
          </div>
          <QuickCommandDeck onAskJarvis={(prompt) => void askJarvis(prompt)} />
        </section>

        {/* RIGHT COLUMN: AI CONVERSATION, ARC REACTOR, ARMOR & MEMORY */}
        <aside className="cockpit-col-right">
          <section className="chat-card" aria-label="Jarvis assistant">
            <p className="jarvis-brand">J.A.R.V.I.S. MARK VII</p>
            <h1>Welcome back, Ash.</h1>
            <p className="connection-state">{stateLabel}</p>
            <div className="messages" ref={messagesRef} aria-live="polite">
              {messages.length === 0 && !pendingAction && <p>Systems online. State your command or say "Hey Jarvis".</p>}
              {messages.map((message, index) => (
                <p className={`message ${message.author}`} key={`${message.author}-${index}`}>
                  {message.text}
                </p>
              ))}
              {status === "thinking" && <p className="message jarvis">Thinking…</p>}
              {pendingAction && (
                <div className="web-action-confirmation" role="alert">
                  {pendingAction.type === "web" ? (
                    <>
                      <p>Open {pendingAction.action.label}?</p>
                      <small>{pendingAction.action.url}</small>
                    </>
                  ) : (
                    <>
                      <p>Launch {pendingAction.action.label}?</p>
                      <small>Target: {pendingAction.action.appId}</small>
                    </>
                  )}
                  <div>
                    <button type="button" onClick={() => void confirmAction()}>
                      Confirm
                    </button>
                    <button type="button" onClick={cancelAction}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className={`talk-button ${status === "listening" ? "is-listening" : ""}`}
              type="button"
              onClick={() => {
                if (status === "listening") {
                  finishListening();
                } else {
                  void startListening();
                }
              }}
              disabled={status === "thinking" || backendStarting}
            >
              {status === "listening" ? "🎙️ Tap to stop & send" : backendStarting ? "Starting Jarvis…" : "🎙️ Say 'Hey Jarvis' or Tap to Talk"}
            </button>
            <form onSubmit={handleSubmit} noValidate className="composer">
              <label className="sr-only" htmlFor="chat-input">
                Message Jarvis
              </label>
              <input
                id="chat-input"
                value={input}
                maxLength={2000}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type a message for Ash…"
                disabled={status === "thinking" || backendStarting}
              />
              <button type="submit" disabled={!input.trim() || status === "thinking" || backendStarting}>
                Send
              </button>
            </form>
            <label className="voice-picker" htmlFor="voice-select">
              Voice Persona
              <select
                id="voice-select"
                value={voiceId}
                onChange={(event) => {
                  setVoiceId(event.target.value);
                  sfx.playBeep(1100, 0.05);
                }}
                disabled={!voices.length}
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>

          <ArcReactorDiagnostics />
          <ArmorDiagnostics />
          <MemoryVaultHUD />
        </aside>
      </div>
    </main>
  );
}
