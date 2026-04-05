import type { EditorView } from "@codemirror/view";
import type { MutableRefObject } from "react";
import { toggleBold, toggleUnderline } from "../../functionality/editor/format-marks";

export function FormatToolbar({
  editorViewRef,
}: {
  editorViewRef: MutableRefObject<EditorView | null>;
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
          e.preventDefault(); // keep editor focus
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
      <span className="fmt-hint">Select text, then click</span>
    </div>
  );
}
