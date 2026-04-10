import { useCallback, useEffect, useRef, useState } from "react";
import { useHoverHintBinder } from "./HoverHintsContext";

interface ReadAloudButtonProps {
  getText: () => string;
}

export function ReadAloudButton({ getText }: ReadAloudButtonProps) {
  const hint = useHoverHintBinder();
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => "speechSynthesis" in window);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearKeepAlive = () => {
    if (keepAliveRef.current !== null) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      clearKeepAlive();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    clearKeepAlive();
    setSpeaking(false);
  }, []);

  const play = useCallback(() => {
    const text = getText().trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    clearKeepAlive();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1.0;
    utt.onstart = () => {
      setSpeaking(true);
      // Chrome stops speaking after ~15 s unless periodically resumed.
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 14000);
    };
    utt.onend = () => { clearKeepAlive(); setSpeaking(false); };
    utt.onerror = () => { clearKeepAlive(); setSpeaking(false); };
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [getText]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`fmt-btn fmt-tidy-btn read-aloud-btn${speaking ? " is-active" : ""}`}
      {...hint(speaking ? "Stop reading aloud" : "Read poem aloud with the browser voice")}
      aria-label={speaking ? "Stop reading aloud" : "Read poem aloud"}
      onClick={speaking ? stop : play}
    >
      {speaking ? "⏹" : "▶"}
    </button>
  );
}
