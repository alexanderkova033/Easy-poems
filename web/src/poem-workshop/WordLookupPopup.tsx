import "./WordLookupPopup.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { EditorView } from "@codemirror/view";

interface DictMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictEntry {
  word: string;
  meanings: DictMeaning[];
}

interface AnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface PopupPos {
  left: number;
  top: number;
}

const MAX_SYNONYMS = 42;
const MAX_ANTONYMS = 28;

function collectFromDict(entry: DictEntry): { syns: string[]; ants: string[] } {
  const synSet = new Set<string>();
  const antSet = new Set<string>();
  for (const m of entry.meanings) {
    for (const s of m.synonyms ?? []) synSet.add(s.trim());
    for (const a of m.antonyms ?? []) antSet.add(a.trim());
    for (const d of m.definitions) {
      for (const s of d.synonyms ?? []) synSet.add(s.trim());
      for (const a of d.antonyms ?? []) antSet.add(a.trim());
    }
  }
  return {
    syns: [...synSet].filter(Boolean),
    ants: [...antSet].filter(Boolean),
  };
}

function mergeWordLists(
  lookup: string,
  primary: string[],
  extra: string[],
  max: number,
): string[] {
  const lower = lookup.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const w = raw.trim();
    if (!w) return;
    const k = w.toLowerCase();
    if (k === lower || seen.has(k)) return;
    seen.add(k);
    out.push(w);
  };
  for (const w of primary) add(w);
  for (const w of extra) add(w);
  return out.slice(0, max);
}

interface DatamuseRow {
  word?: string;
}

async function fetchDatamuseRelated(
  w: string,
  signal: AbortSignal,
): Promise<{ syns: string[]; ants: string[] }> {
  const q = encodeURIComponent(w);
  const urls = [
    `https://api.datamuse.com/words?rel_syn=${q}&max=40`,
    `https://api.datamuse.com/words?rel_ant=${q}&max=30`,
    `https://api.datamuse.com/words?ml=${q}&max=35`,
  ];
  try {
    const results = await Promise.all(
      urls.map((url) =>
        fetch(url, { signal }).then(async (r) => {
          if (!r.ok) return [];
          const j: unknown = await r.json();
          return Array.isArray(j) ? j : [];
        }),
      ),
    );
    const synRows = [
      ...(results[0] as DatamuseRow[]),
      ...(results[2] as DatamuseRow[]),
    ];
    const antRows = results[1] as DatamuseRow[];
    const syns = synRows.map((r) => r.word).filter(Boolean) as string[];
    const ants = antRows.map((r) => r.word).filter(Boolean) as string[];
    return { syns, ants };
  } catch {
    return { syns: [], ants: [] };
  }
}

function firstDef(entry: DictEntry): { pos: string; text: string } | null {
  for (const m of entry.meanings) {
    const d = m.definitions[0];
    if (d) return { pos: m.partOfSpeech, text: d.definition };
  }
  return null;
}

/** Prefer CodeMirror’s geometry so the popup tracks the real selection pixels. */
function anchorFromEditorSelection(view: EditorView): { word: string; anchor: AnchorRect } | null {
  const sel = view.state.selection.main;
  if (sel.empty) return null;
  const raw = view.state.sliceDoc(sel.from, sel.to).trim();
  const singleToken = raw.replace(/\s+/g, "");
  if (!singleToken || singleToken.length < 2 || singleToken.length > 48) return null;
  if (/\s/.test(raw) && raw !== singleToken) return null;

  const fromC = view.coordsAtPos(sel.from);
  const toC = view.coordsAtPos(sel.to);
  if (!fromC || !toC) return null;
  const left = Math.min(fromC.left, toC.left);
  const top = Math.min(fromC.top, toC.top);
  const right = Math.max(fromC.right, toC.right);
  const bottom = Math.max(fromC.bottom, toC.bottom);

  const clean = singleToken.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
  if (clean.length < 2) return null;

  return {
    word: clean,
    anchor: {
      left,
      top,
      right,
      bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    },
  };
}

export function WordLookupPopup({
  editorViewRef,
}: {
  editorViewRef: MutableRefObject<EditorView | null>;
}) {
  const [word, setWord] = useState<string | null>(null);
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [altSyns, setAltSyns] = useState<string[]>([]);
  const [altAnts, setAltAnts] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "notfound" | "error">(
    "idle",
  );
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookupRef = useRef<string | null>(null);

  const runLookup = useCallback(async (w: string, signal: AbortSignal) => {
    setStatus("loading");
    setEntry(null);
    setAltSyns([]);
    setAltAnts([]);
    try {
      const [dictRes, dm] = await Promise.all([
        fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`,
          { signal },
        ),
        fetchDatamuseRelated(w, signal),
      ]);
      if (dictRes.status === 404) {
        setEntry(null);
        const sy = mergeWordLists(w, [], dm.syns, MAX_SYNONYMS);
        const an = mergeWordLists(w, [], dm.ants, MAX_ANTONYMS);
        setAltSyns(sy);
        setAltAnts(an);
        setStatus(sy.length === 0 && an.length === 0 ? "notfound" : "idle");
        return;
      }
      if (!dictRes.ok) {
        setEntry(null);
        setAltSyns([]);
        setAltAnts([]);
        setStatus("error");
        return;
      }
      const data = (await dictRes.json()) as DictEntry[];
      const ent = data[0] ?? null;
      setEntry(ent);
      const fromDict = ent ? collectFromDict(ent) : { syns: [], ants: [] };
      setAltSyns(mergeWordLists(w, fromDict.syns, dm.syns, MAX_SYNONYMS));
      setAltAnts(mergeWordLists(w, fromDict.ants, dm.ants, MAX_ANTONYMS));
      setStatus("idle");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setEntry(null);
      setAltSyns([]);
      setAltAnts([]);
      setStatus("error");
    }
  }, []);

  const close = useCallback(() => {
    lastLookupRef.current = null;
    setWord(null);
    setEntry(null);
    setAltSyns([]);
    setAltAnts([]);
    setAnchor(null);
    setPopupPos(null);
    setStatus("idle");
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const view = editorViewRef.current;
        if (!view) return;
        const got = anchorFromEditorSelection(view);
        if (!got) return;
        setAnchor(got.anchor);
        if (lastLookupRef.current === got.word) return;
        lastLookupRef.current = got.word;
        setWord(got.word);
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        void runLookup(got.word, ctrl.signal);
      }, 280);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editorViewRef, runLookup]);

  const def = entry ? firstDef(entry) : null;
  const syns = altSyns;
  const ants = altAnts;

  useLayoutEffect(() => {
    if (!word || !anchor || !popupRef.current) {
      setPopupPos(null);
      return;
    }
    const el = popupRef.current;
    const br = el.getBoundingClientRect();
    const margin = 10;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const preferBelowTop = anchor.bottom + gap;
    const preferAboveTop = anchor.top - gap - br.height;
    let top =
      preferBelowTop + br.height <= vh - margin
        ? preferBelowTop
        : preferAboveTop;
    if (top < margin) top = margin;
    if (top + br.height > vh - margin) top = Math.max(margin, vh - margin - br.height);

    let left = anchor.left + anchor.width / 2 - br.width / 2;
    const idealLeft = left;
    if (left + br.width > vw - margin) left = vw - margin - br.width;
    if (left < margin) left = margin;
    if (idealLeft !== left) {
      const stick = anchor.left;
      if (stick + br.width <= vw - margin) left = Math.max(margin, stick);
    }
    setPopupPos({ left, top });
  }, [word, anchor, status, entry, syns.length, ants.length]);

  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [word, close]);

  if (!word || !anchor) return null;

  const showLoading = status === "loading";
  const showError = status === "error";
  const showNotFound =
    status === "notfound" && !def && syns.length === 0 && ants.length === 0;

  return (
    <div
      ref={popupRef}
      className="word-lookup-popup"
      style={
        popupPos
          ? { left: popupPos.left, top: popupPos.top, transform: "none" }
          : {
              left: anchor.left + anchor.width / 2,
              top: anchor.bottom + 8,
              transform: "translateX(-50%)",
              visibility: "hidden" as const,
            }
      }
      role="dialog"
      aria-label={`Definition of ${word}`}
    >
      <div className="word-lookup-head">
        <span className="word-lookup-word">{word}</span>
        <button type="button" className="word-lookup-close" onClick={close} aria-label="Close">
          ×
        </button>
      </div>

      {showLoading && (
        <p className="word-lookup-loading muted small">Looking up…</p>
      )}

      {showError && (
        <p className="word-lookup-error muted small" role="alert">
          Can&apos;t reach the dictionary or word services right now — check your
          connection or try again. Your poem stays local; only this lookup needs
          the network.
        </p>
      )}

      {showNotFound && (
        <p className="word-lookup-notfound muted small">No definition found.</p>
      )}

      {def && (
        <div className="word-lookup-def word-lookup-def-tight">
          <span className="word-lookup-pos">{def.pos}</span>
          <span className="word-lookup-text">{def.text}</span>
        </div>
      )}

      {!def &&
      !showLoading &&
      !showError &&
      !showNotFound &&
      (syns.length > 0 || ants.length > 0) ? (
        <p className="word-lookup-dict-fallback muted small">
          No full dictionary entry — showing related words.
        </p>
      ) : null}

      {syns.length > 0 && (
        <div className="word-lookup-group word-lookup-group-tight">
          <span className="word-lookup-group-label">Synonyms &amp; similar</span>
          <div className="word-lookup-chips">
            {syns.map((s) => (
              <span key={s} className="word-lookup-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {ants.length > 0 && (
        <div className="word-lookup-group word-lookup-group-tight">
          <span className="word-lookup-group-label">Antonyms &amp; opposites</span>
          <div className="word-lookup-chips word-lookup-chips-ant">
            {ants.map((a) => (
              <span key={a} className="word-lookup-chip word-lookup-chip-ant">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
