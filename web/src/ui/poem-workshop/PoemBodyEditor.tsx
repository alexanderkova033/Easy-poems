import { EditorView } from "@codemirror/view";
import type { MutableRefObject } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { basicSetup } from "@uiw/codemirror-extensions-basic-setup";
import {
  bindSpellContext,
  poemEditorTheme,
  poemSpellExtensions,
  spellSyncFacet,
} from "../../functionality/editor/spell-highlight";
import type { SpellMode } from "../../functionality/draft/local-draft-storage";

/** Facet must change on the same render as spellMode (not only after a spellBump effect). */
function spellFacetValue(spellBump: number, spellMode: SpellMode): number {
  return spellBump * 2 + (spellMode === "strict" ? 1 : 0);
}

export interface PoemBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  editorViewRef: MutableRefObject<EditorView | null>;
  wordlist: Set<string> | null;
  spellMode: SpellMode;
  spellBump: number;
  id?: string;
  "aria-describedby"?: string;
}

export function PoemBodyEditor(props: PoemBodyEditorProps) {
  bindSpellContext(() => ({
    dict: props.wordlist,
    mode: props.spellMode,
  }));

  return (
    <div className="poem-cm-wrap" id={props.id}>
      <CodeMirror
        aria-describedby={props["aria-describedby"]}
        value={props.value}
        height="auto"
        theme="none"
        extensions={[
          EditorView.contentAttributes.of({ spellcheck: "false" }),
          spellSyncFacet.of(spellFacetValue(props.spellBump, props.spellMode)),
          poemEditorTheme,
          ...poemSpellExtensions,
          ...basicSetup(),
        ]}
        onChange={(v) => props.onChange(v)}
        onCreateEditor={(view) => {
          props.editorViewRef.current = view;
        }}
      />
    </div>
  );
}
