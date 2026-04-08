import type { EditorView } from "@codemirror/view";
import type { MutableRefObject } from "react";
import { toggleBold, toggleUnderline } from "@/poem-editor/format-marks";
import { POEM_SIZE_OPTIONS, type PoemSizeId } from "./appearance";
import { ReadAloudButton } from "./ReadAloudButton";

function tidyDoubleSpaces(view: EditorView) {
  const text = view.state.doc.toString();
  const fixed = text.replace(/ {2,}/g, " ");
  if (fixed === text) return;
  view.dispatch({
    changes: { from: 0, to: text.length, insert: fixed },
    userEvent: "tidy.double-spaces",
  });
}

function tidyCapLines(view: EditorView) {
  const lines = view.state.doc.toString().split("\n");
  const fixed = lines.map((l) => {
    const trimmed = l.trimStart();
    if (!trimmed) return l;
    const leading = l.slice(0, l.length - trimmed.length);
    return leading + trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  });
  const result = fixed.join("\n");
  const original = view.state.doc.toString();
  if (result === original) return;
  view.dispatch({
    changes: { from: 0, to: original.length, insert: result },
    userEvent: "tidy.cap-lines",
  });
}

function tidyLowerLines(view: EditorView) {
  const lines = view.state.doc.toString().split("\n");
  const fixed = lines.map((l) => {
    const trimmed = l.trimStart();
    if (!trimmed) return l;
    const leading = l.slice(0, l.length - trimmed.length);
    return leading + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  });
  const result = fixed.join("\n");
  const original = view.state.doc.toString();
  if (result === original) return;
  view.dispatch({
    changes: { from: 0, to: original.length, insert: result },
    userEvent: "tidy.lower-lines",
  });
}

function tidyStanzaSpacing(view: EditorView) {
  const text = view.state.doc.toString();
  // Collapse 3+ blank lines to 1 blank line, trim trailing whitespace per line
  const fixed = text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  if (fixed === text) return;
  view.dispatch({
    changes: { from: 0, to: text.length, insert: fixed },
    userEvent: "tidy.stanza-spacing",
  });
}

export function FormatToolbar({
  editorViewRef,
  poemSize,
  onSizeChange,
  getBody,
  onReadingMode,
}: {
  editorViewRef: MutableRefObject<EditorView | null>;
  poemSize: PoemSizeId;
  onSizeChange: (size: PoemSizeId) => void;
  getBody?: () => string;
  onReadingMode?: () => void;
}) {
  const apply = (fn: (v: EditorView) => void) => {
    const view = editorViewRef.current;
    if (view) fn(view);
  };

  return (
    <div className="format-toolbar" role="toolbar" aria-label="Text formatting">
      <button
        type="button"
        className="fmt-btn"
        title="Bold selected text  (**text**)"
        aria-label="Bold"
        onMouseDown={(e) => {
          e.preventDefault();
          apply(toggleBold);
        }}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className="fmt-btn fmt-btn-underline"
        title="Underline selected text  (__text__)"
        aria-label="Underline"
        onMouseDown={(e) => {
          e.preventDefault();
          apply(toggleUnderline);
        }}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>
      <label className="fmt-size-label">
        <span className="fmt-size-label-text">Size</span>
        <select
          className="fmt-size-select"
          value={poemSize}
          onChange={(e) => onSizeChange(e.target.value as PoemSizeId)}
        >
          {POEM_SIZE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <span className="fmt-sep" aria-hidden />

      <button
        type="button"
        className="fmt-btn fmt-tidy-btn"
        title="Remove double spaces"
        aria-label="Remove double spaces"
        onMouseDown={(e) => { e.preventDefault(); apply(tidyDoubleSpaces); }}
      >
        A·A
      </button>
      <button
        type="button"
        className="fmt-btn fmt-tidy-btn"
        title="Capitalise first letter of each line"
        aria-label="Capitalise first letter of each line"
        onMouseDown={(e) => { e.preventDefault(); apply(tidyCapLines); }}
      >
        ↑Aa
      </button>
      <button
        type="button"
        className="fmt-btn fmt-tidy-btn"
        title="Lowercase first letter of each line"
        aria-label="Lowercase first letter of each line"
        onMouseDown={(e) => { e.preventDefault(); apply(tidyLowerLines); }}
      >
        ↓aa
      </button>
      <button
        type="button"
        className="fmt-btn fmt-tidy-btn"
        title="Even stanza spacing (collapse extra blank lines, trim trailing spaces)"
        aria-label="Even stanza spacing"
        onMouseDown={(e) => { e.preventDefault(); apply(tidyStanzaSpacing); }}
      >
        ¶≡
      </button>

      {getBody && <ReadAloudButton getText={getBody} />}
      {onReadingMode && (
        <button
          type="button"
          className="fmt-btn fmt-tidy-btn"
          title="Reading view — clean display of finished poem"
          aria-label="Reading view"
          onMouseDown={(e) => { e.preventDefault(); onReadingMode(); }}
        >
          ☰
        </button>
      )}
      <span className="fmt-hint">Select text for B/U · Click tidy buttons anytime</span>
    </div>
  );
}
