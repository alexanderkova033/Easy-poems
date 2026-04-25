import { EditorView, ViewPlugin, Decoration, type DecorationSet } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import type { Range } from "@codemirror/state";

export const setLineFocusEnabled = StateEffect.define<boolean>();

const lineFocusEnabled = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setLineFocusEnabled)) return e.value;
    }
    return value;
  },
});

const dimmedLine = Decoration.line({ class: "cm-line-dimmed" });

const lineFocusPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(update: { docChanged: boolean; selectionSet: boolean; view: EditorView; startState: ReturnType<EditorView["state"]["toJSON"]> }) {
      if (update.docChanged || update.selectionSet || (update as { startState: { field?: (f: typeof lineFocusEnabled) => boolean } }).startState) {
        this.decorations = this.build((update as unknown as { view: EditorView }).view);
      }
    }
    build(view: EditorView): DecorationSet {
      if (!view.state.field(lineFocusEnabled)) return Decoration.none;
      const sel = view.state.selection.main;
      const activeLine = view.state.doc.lineAt(sel.head).number;
      const decos: Range<Decoration>[] = [];
      for (let i = 1; i <= view.state.doc.lines; i++) {
        if (i === activeLine) continue;
        const line = view.state.doc.line(i);
        if (!line.text.trim()) continue;
        decos.push(dimmedLine.range(line.from));
      }
      return Decoration.set(decos, true);
    }
  },
  { decorations: (v) => v.decorations },
);

export const lineFocusExtension = [lineFocusEnabled, lineFocusPlugin];
