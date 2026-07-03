import React, { useEffect, useRef, useState } from "react";
import { postBrainChat } from "../api.js";

const WELCOME =
  "Hey — tell me what's going on. \"Rainy evening, feeling nostalgic\", \"heading to Raj's place, play Atif Aslam\", or just \"surprise me\" all work. I'll figure out the mood and build the queue.";

export default function AIChat({ userId, onResult, geminiConfigured }) {
  const [messages, setMessages] = useState([{ role: "assistant", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(
    () => typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      send(text);
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

  async function send(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await postBrainChat({
        userId,
        message: text,
        history: nextMessages.slice(-9, -1), // last few turns, not counting the message we just sent
      });
      setMessages((prev) => [...prev, { role: "assistant", text: result.replyText, source: result.source }]);
      speak(result.replyText);
      onResult({
        context: result.context,
        scenario: result.scenario,
        queue: result.queue,
        patternHint: result.patternHint,
        source: result.source,
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry, something went wrong: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat__header">
        <span className="ai-chat__title">AI Brain</span>
        <span className={`badge ${geminiConfigured ? "badge--live" : "badge--mock"}`}>
          {geminiConfigured ? "gemini" : "rule-based (no key)"}
        </span>
      </div>

      <div className="ai-chat__messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ai-chat__bubble ai-chat__bubble--${m.role}`}>
            {m.text}
            {m.source === "rule-based" && (
              <span className="ai-chat__bubble-tag">rule-based fallback</span>
            )}
          </div>
        ))}
        {loading && <div className="ai-chat__bubble ai-chat__bubble--assistant ai-chat__bubble--thinking">Thinking…</div>}
      </div>

      <div className="ai-chat__inputrow">
        {speechSupported && (
          <button
            type="button"
            className={`ai-chat__mic ${listening ? "ai-chat__mic--active" : ""}`}
            onClick={listening ? stopListening : startListening}
            title="Speak"
          >
            🎤
          </button>
        )}
        <input
          type="text"
          placeholder="What's the vibe?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button type="button" disabled={loading || !input.trim()} onClick={() => send()}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
