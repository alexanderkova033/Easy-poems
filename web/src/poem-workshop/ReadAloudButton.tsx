import { useCallback, useEffect, useRef, useState } from "react";

interface ReadAloudButtonProps {
  getText: () => string;
}

export function ReadAloudButton({ getText }: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => "speechSynthesis" in window);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const play = useCallback(() => {
    const text = getText().trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1.0;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [getText]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`fmt-btn fmt-tidy-btn read-aloud-btn${speaking ? " is-active" : ""}`}
      title={speaking ? "Stop reading aloud" : "Read poem aloud"}
      aria-label={speaking ? "Stop reading aloud" : "Read poem aloud"}
      onClick={speaking ? stop : play}
    >
      {speaking ? "⏹" : "▶"}
    </button>
  );
}
