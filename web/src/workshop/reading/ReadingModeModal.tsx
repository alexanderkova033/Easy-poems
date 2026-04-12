import "./ReadingModeModal.css";
import { useEffect } from "react";
import { stripFormatMarkers } from "@/workshop/editor/format-marks";

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
      <div className="reading-mode-frame">
        <div className="reading-mode-tear reading-mode-tear--top" aria-hidden="true" />
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
            <div className="reading-mode-divider" aria-hidden>
              <span className="reading-mode-divider-ornament">&#10022;</span>
            </div>
            <div className="reading-mode-body">
              {lines.map((line, i) =>
                line.trim() === "" ? (
                  <div key={i} className="reading-mode-stanza-break" aria-hidden />
                ) : (
                  <p key={i} className="reading-mode-line">{line}</p>
                ),
              )}
              <div className="reading-mode-fin" aria-hidden>&#8258;</div>
            </div>
          </article>
        </div>
        <div className="reading-mode-tear reading-mode-tear--bottom" aria-hidden="true" />
      </div>
    </div>
  );
}
