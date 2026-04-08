import { useEffect } from "react";
import { stripFormatMarkers } from "@/poem-editor/format-marks";

interface ReadingModeModalProps {
  title: string;
  formNote: string;
  body: string;
  onClose: () => void;
}

export function ReadingModeModal({ title, formNote, body, onClose }: ReadingModeModalProps) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cleanBody = stripFormatMarkers(body);
  const lines = cleanBody.split("\n");

  return (
    <div
      className="reading-mode-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="reading-mode-modal" role="dialog" aria-modal="true" aria-label="Reading view">
        <button
          type="button"
          className="reading-mode-close"
          onClick={onClose}
          aria-label="Close reading view"
        >
          ×
        </button>
        <article className="reading-mode-poem">
          {title && <h1 className="reading-mode-title">{title}</h1>}
          {formNote && <p className="reading-mode-form">{formNote}</p>}
          <div className="reading-mode-body">
            {lines.map((line, i) =>
              line.trim() === "" ? (
                <div key={i} className="reading-mode-stanza-break" aria-hidden />
              ) : (
                <p key={i} className="reading-mode-line">{line}</p>
              ),
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
