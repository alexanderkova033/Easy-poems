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
  definitions: { definition: string; example?: string; synonyms?: string[]; antonyms?: string[] }[];
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

function allSynonyms(entry: DictEntry): string[] {
  const set = new Set<string>();
  for (const m of entry.meanings) {
    (m.synonyms ?? []).forEach((s) => set.add(s));
    for (const d of m.definitions) {
      (d.synonyms ?? []).forEach((s) => set.add(s));
    }
  }
  return [...set].slice(0, 12);
}

function allAntonyms(entry: DictEntry): string[] {
  const set = new Set<string>();
  for (const m of entry.meanings) {
    (m.antonyms ?? []).forEach((a) => set.add(a));
    for (const d of m.definitions) {
      (d.antonyms ?? []).forEach((a) => set.add(a));
    }
  }
  return [...set].slice(0, 8);
}

function firstDef(entry: DictEntry): { pos: string; text: string } | null {
  for (const m of entry.meanings) {
    const d = m.definitions[0];
    if (d) return { pos: m.partOfSpeech, text: d.definition };
  }
  return null;
}

export function WordLookupPopup({
  editorViewRef,
}: {
  editorViewRef: MutableRefObject<EditorView | null>;
}) {
  const [word, setWord] = useState<string | null>(null);
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "notfound">("idle");
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = useCallback(async (w: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    setEntry(null);
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`,
        { signal: ctrl.signal },
      );
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) throw new Error("dict error");
      const data = (await res.json()) as DictEntry[];
      setEntry(data[0] ?? null);
      setStatus("idle");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("notfound");
    }
  }, []);

  const close = useCallback(() => {
    setWord(null);
    setEntry(null);
    setAnchor(null);
    setPopupPos(null);
    setStatus("idle");
    abortRef.current?.abort();
  }, []);

  // Listen for selection changes — selectionchange fires on both mouse and touch
  useEffect(() => {
    const onSelectionChange = () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
      lookupTimer.current = setTimeout(() => {
        const view = editorViewRef.current;
        if (!view) return;

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

        const raw = sel.toString().trim();
        if (!raw || raw.includes(" ") || raw.length > 40 || raw.length < 2) return;

        // Make sure the selection is inside the editor
        const editorEl = view.dom;
        let node: Node | null = sel.anchorNode;
        let inside = false;
        while (node) {
          if (node === editorEl) {
            inside = true;
            break;
          }
          node = node.parentNode;
        }
        if (!inside) return;

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        setAnchor({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });

        const clean = raw.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
        if (clean.length < 2) return;
        setWord(clean);
        void lookup(clean);
      }, 300);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [editorViewRef, lookup]);

  const def = entry ? firstDef(entry) : null;
  const syns = entry ? allSynonyms(entry) : [];
  const ants = entry ? allAntonyms(entry) : [];

  useLayoutEffect(() => {
    if (!word || !anchor || !popupRef.current) {
      setPopupPos(null);
      return;
    }
    const el = popupRef.current;
    const br = el.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    let left = anchor.left;
    let top = anchor.bottom + gap;
    if (top + br.height > window.innerHeight - margin) {
      top = anchor.top - gap - br.height;
    }
    if (top < margin) top = margin;
    if (left + br.width > window.innerWidth - margin) {
      left = window.innerWidth - margin - br.width;
    }
    if (left < margin) left = margin;
    setPopupPos({ left, top });
  }, [word, anchor, status, entry]);

  // Close on Escape or click outside
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

  return (
    <div
      ref={popupRef}
      className="word-lookup-popup"
      style={
        popupPos
          ? { left: popupPos.left, top: popupPos.top, transform: "none" }
          : {
              left: anchor.left,
              top: anchor.bottom + 6,
              transform: "none",
              visibility: "hidden" as const,
            }
      }
      role="dialog"
      aria-label={`Definition of ${word}`}
    >
      <div className="word-lookup-head">
        <span className="word-lookup-word">{word}</span>
        <button type="button" className="word-lookup-close" onClick={close} aria-label="Close">×</button>
      </div>

      {status === "loading" && (
        <p className="word-lookup-loading muted small">Looking up…</p>
      )}

      {status === "notfound" && (
        <p className="word-lookup-notfound muted small">No definition found.</p>
      )}

      {def && (
        <div className="word-lookup-def word-lookup-def-tight">
          <span className="word-lookup-pos">{def.pos}</span>
          <span className="word-lookup-text">{def.text}</span>
        </div>
      )}

      {syns.length > 0 && (
        <div className="word-lookup-group word-lookup-group-tight">
          <span className="word-lookup-group-label">Synonyms</span>
          <div className="word-lookup-chips">
            {syns.map((s) => <span key={s} className="word-lookup-chip">{s}</span>)}
          </div>
        </div>
      )}

      {ants.length > 0 && (
        <div className="word-lookup-group word-lookup-group-tight">
          <span className="word-lookup-group-label">Antonyms</span>
          <div className="word-lookup-chips word-lookup-chips-ant">
            {ants.map((a) => <span key={a} className="word-lookup-chip word-lookup-chip-ant">{a}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
