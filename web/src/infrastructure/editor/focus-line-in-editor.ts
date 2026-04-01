import type { EditorView } from "@codemirror/view";

/** Select a logical line in a CodeMirror 6 view (1-based line numbers). */
export function focusLineInEditor(
  view: EditorView,
  line1Based: number,
): void {
  const doc = view.state.doc;
  const n = Math.max(1, Math.min(line1Based, doc.lines));
  const line = doc.line(n);
  view.dispatch({
    selection: { anchor: line.from, head: line.to },
    scrollIntoView: true,
  });
  view.focus();
}
