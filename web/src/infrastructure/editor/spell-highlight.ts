import { Facet, StateEffect, StateField, type Transaction } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { SpellMode } from "../../domain/draft/local-draft-storage";
import { loadPersonalDictionary, loadSessionIgnores } from "../../domain/spellcheck/personal-dictionary";
import { spellErrorRangesFromText } from "../../domain/spellcheck/scan";

export const spellSyncFacet = Facet.define<number, number>({
  combine: (xs) => xs[xs.length - 1] ?? 0,
});

type SpellCtx = () => { dict: Set<string> | null; mode: SpellMode };

let spellContext: SpellCtx = () => ({ dict: null, mode: "permissive" });

/** Call each render (or via layout effect) so the plugin reads fresh dict/mode. */
export function bindSpellContext(fn: SpellCtx): void {
  spellContext = fn;
}

const setSpellDeco = StateEffect.define<DecorationSet>();

const spellField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value: DecorationSet, tr: Transaction) {
    for (const e of tr.effects) {
      if (e.is(setSpellDeco)) return e.value;
    }
    return tr.docChanged ? value.map(tr.changes) : value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const spellPlugin = ViewPlugin.fromClass(
  class {
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private lastRev = -1;
    private disposed = false;

    constructor(private view: EditorView) {
      this.schedule();
    }

    update(u: ViewUpdate) {
      const rev = u.state.facet(spellSyncFacet);
      if (u.docChanged || rev !== this.lastRev) {
        this.lastRev = rev;
        this.schedule();
      }
    }

    private schedule() {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => this.run(), 180);
    }

    private run() {
      if (this.disposed) return;
      const { dict, mode } = spellContext();
      if (!dict) {
        this.safeDispatch(setSpellDeco.of(Decoration.none));
        return;
      }
      const text = this.view.state.doc.toString();
      const ranges = spellErrorRangesFromText(
        text,
        dict,
        loadPersonalDictionary(),
        loadSessionIgnores(),
        mode,
      );
      const deco = ranges.map((r) =>
        Decoration.mark({ class: "cm-spell-error" }).range(r.from, r.to),
      );
      this.safeDispatch(setSpellDeco.of(Decoration.set(deco)));
    }

    private safeDispatch(effect: StateEffect<DecorationSet>) {
      try {
        if (this.disposed) return;
        this.view.dispatch({ effects: effect });
      } catch {
        /* view may be tearing down */
      }
    }

    destroy() {
      this.disposed = true;
      clearTimeout(this.timeout);
    }
  },
);

export const poemSpellExtensions = [spellField, spellPlugin];

export const poemEditorTheme = EditorView.theme({
  "&": {
    fontSize: "16px",
    minHeight: "13rem",
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    transition: "border-color 0.2s ease",
  },
  ".cm-scroller": { fontFamily: "inherit" },
  ".cm-content": {
    fontFamily: "var(--font-poem), Georgia, serif",
    caretColor: "var(--text)",
    minHeight: "13rem",
    padding: "0.6rem 0.7rem",
  },
  ".cm-gutters": {
    backgroundColor: "var(--surface)",
    color: "var(--muted)",
    borderRight: "1px solid var(--border)",
    borderTopLeftRadius: "8px",
    borderBottomLeftRadius: "8px",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 0.35rem 0 0.5rem" },
  /* Match global ::selection — avoid system / default light fill */
  ".cm-selectionBackground": {
    background: "var(--selection-bg) !important",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background:
      "color-mix(in srgb, var(--selection-bg) 92%, var(--accent)) !important",
  },
  ".cm-focused": {
    outline: "2px solid color-mix(in srgb, var(--accent) 55%, var(--border))",
    outlineOffset: "1px",
  },
});
