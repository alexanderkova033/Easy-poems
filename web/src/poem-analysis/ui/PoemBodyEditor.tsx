import type { EditorView } from "@codemirror/view";
import type { MutableRefObject } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { basicSetup } from "@uiw/codemirror-extensions-basic-setup";
import {
  bindSpellContext,
  poemEditorTheme,
  poemSpellExtensions,
  spellSyncFacet,
} from "../../codemirror/spell-highlight";
import type { SpellMode } from "../../poem-draft/local-draft-storage";

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
          spellSyncFacet.of(props.spellBump),
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
