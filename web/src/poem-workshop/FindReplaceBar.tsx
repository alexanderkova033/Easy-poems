import type { EditorView } from "@codemirror/view";
import {
  SearchQuery,
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  setSearchQuery,
} from "@codemirror/search";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHoverHintBinder } from "./HoverHintsContext";

export interface FindReplaceBarProps {
  editorView: EditorView | null;
  open: boolean;
  mode: "find" | "replace";
  onClose: () => void;
}

export function FindReplaceBar(props: FindReplaceBarProps) {
  const hint = useHoverHintBinder();
  const { editorView, open, mode, onClose } = props;
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const findRef = useRef<HTMLInputElement | null>(null);

  const query = useMemo(() => {
    return new SearchQuery({
      search: find,
      replace,
      caseSensitive,
      wholeWord,
      regexp,
    });
  }, [caseSensitive, find, regexp, replace, wholeWord]);

  useEffect(() => {
    if (!open) return;
    if (!editorView) return;
    editorView.dispatch({ effects: setSearchQuery.of(query) });
  }, [editorView, open, query]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      findRef.current?.focus();
      findRef.current?.select();
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        if (!editorView || !find.trim()) return;
        e.preventDefault();
        findNext(editorView);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editorView, find, onClose, open]);

  useEffect(() => {
    if (open) return;
    if (!editorView) return;
    // Clear highlights when closing.
    editorView.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: "",
          replace: "",
          caseSensitive,
          wholeWord,
          regexp,
        }),
      ),
    });
  }, [caseSensitive, editorView, open, regexp, wholeWord]);

  if (!open) return null;

  return (
    <div className="findbar" role="group" aria-label="Find and replace">
      <div className="findbar-row">
        <label className="findbar-field">
          Find
          <input
            ref={findRef}
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="Text…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {mode === "replace" ? (
          <label className="findbar-field">
            Replace
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replacement…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : null}
        <div className="findbar-actions">
          <button
            type="button"
            className="small-btn"
            onClick={() => editorView && findPrevious(editorView)}
            disabled={!editorView || !find.trim()}
            {...hint("Previous match")}
          >
            Prev
          </button>
          <button
            type="button"
            className="small-btn small-btn-primary"
            onClick={() => editorView && findNext(editorView)}
            disabled={!editorView || !find.trim()}
            {...hint("Next match")}
          >
            Next
          </button>
          {mode === "replace" ? (
            <>
              <button
                type="button"
                className="small-btn"
                onClick={() => editorView && replaceNext(editorView)}
                disabled={!editorView || !find.trim()}
                {...hint("Replace current match and move to the next")}
              >
                Replace
              </button>
              <button
                type="button"
                className="small-btn"
                onClick={() => editorView && replaceAll(editorView)}
                disabled={!editorView || !find.trim()}
                {...hint("Replace all matches in the poem")}
              >
                All
              </button>
            </>
          ) : null}
          <button type="button" className="small-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="findbar-row findbar-toggles" aria-label="Find options">
        <label className="findbar-toggle">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Case
        </label>
        <label className="findbar-toggle">
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={(e) => setWholeWord(e.target.checked)}
          />
          Word
        </label>
        <label className="findbar-toggle">
          <input
            type="checkbox"
            checked={regexp}
            onChange={(e) => setRegexp(e.target.checked)}
          />
          Regex
        </label>
        <span className="muted small findbar-hint">
          Tip: <span className="mono">⌘/Ctrl+F</span> find,{" "}
          <span className="mono">⌘/Ctrl+H</span> replace.
        </span>
      </div>
    </div>
  );
}

