import { EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { highlightSelectionMatches, search } from "@codemirror/search";
import { countSyllablesInLine } from "@/workshop/analysis/syllables";
import type { MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { basicSetup } from "@uiw/codemirror-extensions-basic-setup";
import {
  bindSpellContext,
  poemEditorTheme,
  poemSpellExtensions,
  spellSyncFacet,
} from "@/workshop/editor/spell-highlight";
import {
  formatMarksExtension,
  formatMarksTheme,
} from "@/workshop/editor/format-marks";
import type { SpellMode } from "@/workshop/library/local-draft-storage";

// ---- Syllable count line widgets ----
class SyllableWidget extends WidgetType {
  constructor(readonly count: number) { super(); }
  eq(other: SyllableWidget) { return other.count === this.count; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-syllable-count";
    span.textContent = `${this.count}`;
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  ignoreEvent() { return true; }
}

const syllableCountPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(update: { docChanged: boolean; view: EditorView }) {
      if (update.docChanged) this.decorations = this.build(update.view);
    }
    build(view: EditorView): DecorationSet {
      const decos = [];
      for (let i = 1; i <= view.state.doc.lines; i++) {
        const line = view.state.doc.line(i);
        if (!line.text.trim()) continue;
        const count = countSyllablesInLine(line.text);
        if (count === 0) continue;
        decos.push(
          Decoration.widget({ widget: new SyllableWidget(count), side: 1 })
            .range(line.to),
        );
      }
      return Decoration.set(decos);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Facet must change on the same render as spellMode (not only after a spellBump effect). */
function spellFacetValue(spellBump: number, spellMode: SpellMode): number {
  return spellBump * 2 + (spellMode === "strict" ? 1 : 0);
}

const setLineFlash = StateEffect.define<DecorationSet>();
const clearLineFlash = StateEffect.define<void>();

const lineFlashField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setLineFlash)) next = e.value;
      if (e.is(clearLineFlash)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const setIssueHighlight = StateEffect.define<DecorationSet>();
const clearIssueHighlight = StateEffect.define<void>();

const issueHighlightField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setIssueHighlight)) next = e.value;
      if (e.is(clearIssueHighlight)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export interface PoemBodyEditorProps {
  value: string;
  /** Increment when `value` was set by the workshop (not from the debounced editor pipeline). */
  bodySyncNonce: number;
  onLiveBody: (value: string) => void;
  editorViewRef: MutableRefObject<EditorView | null>;
  wordlist: Set<string> | null;
  spellMode: SpellMode;
  spellBump: number;
  jumpLine?: number | null;
  jumpBump?: number;
  issueHighlight?: [number, number] | null;
  /** Per-line syllable counts at end of each line (CodeMirror widgets). */
  showLineSyllables?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

export function PoemBodyEditor(props: PoemBodyEditorProps) {
  bindSpellContext(() => ({
    dict: props.wordlist,
    mode: props.spellMode,
  }));

  const lastBodySyncNonce = useRef(props.bodySyncNonce);
  const [localValue, setLocalValue] = useState(() => props.value);

  useLayoutEffect(() => {
    if (props.bodySyncNonce !== lastBodySyncNonce.current) {
      lastBodySyncNonce.current = props.bodySyncNonce;
      setLocalValue(props.value);
    }
  }, [props.bodySyncNonce, props.value]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!props.jumpBump) return;
    const view = props.editorViewRef.current;
    const n = props.jumpLine;
    if (!view || !n || n < 1) return;
    try {
      const line = view.state.doc.line(n);
      const deco = Decoration.line({ class: "cm-line-flash" }).range(line.from);
      view.dispatch({ effects: setLineFlash.of(Decoration.set([deco])) });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        try {
          view.dispatch({ effects: clearLineFlash.of(undefined) });
        } catch {
          /* ignore */
        }
      }, 900);
    } catch {
      // line out of range
    }
  }, [props.editorViewRef, props.jumpBump, props.jumpLine]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Issue highlight: dim background on hovered AI issue lines
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const range = props.issueHighlight;
    if (!range) {
      try { view.dispatch({ effects: clearIssueHighlight.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try {
      const [startLine, endLine] = range;
      const decos = [];
      const lineCount = view.state.doc.lines;
      for (let n = startLine; n <= Math.min(endLine, lineCount); n++) {
        const line = view.state.doc.line(n);
        decos.push(Decoration.line({ class: "cm-line-issue-highlight" }).range(line.from));
      }
      view.dispatch({
        effects: setIssueHighlight.of(Decoration.set(decos)),
      });
    } catch { /* line out of range */ }
  }, [props.editorViewRef, props.issueHighlight]);

  const showSyllables = props.showLineSyllables !== false;

  const extensions = useMemo(
    () => [
      EditorView.contentAttributes.of({ spellcheck: "true" }),
      spellSyncFacet.of(spellFacetValue(props.spellBump, props.spellMode)),
      search({ top: true }),
      highlightSelectionMatches(),
      lineFlashField,
      issueHighlightField,
      ...(showSyllables ? [syllableCountPlugin] : []),
      ...poemSpellExtensions,
      formatMarksExtension,
      formatMarksTheme,
      ...basicSetup(),
      poemEditorTheme,
    ],
    [props.spellBump, props.spellMode, showSyllables],
  );

  return (
    <div className="poem-cm-wrap" id={props.id}>
      <CodeMirror
        aria-describedby={props["aria-describedby"]}
        value={localValue}
        height="auto"
        theme="none"
        extensions={extensions}
        onChange={(v) => {
          setLocalValue(v);
          props.onLiveBody(v);
        }}
        onCreateEditor={(view) => {
          props.editorViewRef.current = view;
        }}
      />
    </div>
  );
}
