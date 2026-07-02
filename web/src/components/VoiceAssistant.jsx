import React, { useRef, useState } from "react";
import { postAssistantCommand } from "../api.js";

const EXAMPLE = "I'm going to Raj's place, Maps shows a 45-minute drive. Play songs by Atif Aslam and Sonu Nigam.";

export default function VoiceAssistant({ onQueueReady }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [speechSupported] = useState(
    () => typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
  const recognitionRef = useRef(null);

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      submit(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function submit(text) {
    const command = (text ?? transcript).trim();
    if (!command) return;
    setLoading(true);
    setConfirmation("");
    try {
      const result = await postAssistantCommand({ transcript: command });
      setConfirmation(result.confirmationText);
      onQueueReady(result.queue);
      speak(result.confirmationText);
    } catch (err) {
      setConfirmation(`Sorry, I couldn't process that: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="voice-assistant">
      <div className="voice-assistant__title">Conversational Voice Assistant</div>
      <p className="voice-assistant__hint">
        Zero-typing queueing: say a destination + artists, and the assistant time-caps the queue to
        the live ETA. {speechSupported ? "" : "Your browser doesn't support the microphone API — use the text box below instead."}
      </p>

      {speechSupported && (
        <button
          className={`voice-assistant__mic ${listening ? "voice-assistant__mic--active" : ""}`}
          onClick={listening ? stopListening : startListening}
        >
          {listening ? "● Listening…" : "🎤 Speak a command"}
        </button>
      )}

      <div className="voice-assistant__textrow">
        <input
          type="text"
          placeholder={EXAMPLE}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button disabled={loading} onClick={() => submit()}>
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>

      {confirmation && <div className="voice-assistant__confirmation">{confirmation}</div>}
    </div>
  );
}
