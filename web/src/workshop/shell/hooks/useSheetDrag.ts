import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

/**
 * Height of the tools sheet's resting "peek" as a fraction of the viewport is not
 * fixed — the peek is a rem value in CSS (--tools-peek) so it tracks the handle and
 * header. These bounds are about how far the sheet may travel.
 */
/** Never cover more than this much of the screen — the poem stays partly visible. */
const MIN_TOP_FRACTION = 0.08;
/** Fallback peek height (px) if the CSS custom property cannot be read. */
const FALLBACK_PEEK_PX = 60;
/** Past this much coverage the sheet is the focus, so the scrim goes solid. */
const SCRIM_FRACTION = 0.55;

const STORAGE_KEY = "easy-poems:tools-sheet-top";

interface SheetDragState {
  pointerId: number;
  startY: number;
  startTop: number;
  moved: boolean;
}

interface UseSheetDragOptions {
  toolsPanelRef: MutableRefObject<HTMLElement | null>;
}

function peekPx(panel: HTMLElement | null): number {
  if (!panel) return FALLBACK_PEEK_PX;
  const raw = getComputedStyle(panel).getPropertyValue("--tools-peek").trim();
  if (!raw) return FALLBACK_PEEK_PX;
  if (raw.endsWith("rem")) {
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(raw) * rootPx;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : FALLBACK_PEEK_PX;
}

/**
 * Free-positioned tools sheet.
 *
 * The sheet is never dismissed: it rests peeking above the bottom edge and the
 * writer drags it to whatever height suits them, rather than being snapped to a
 * designer's idea of "half" or "full". Where they leave it is where it stays,
 * across reloads.
 */
export function useSheetDrag({ toolsPanelRef }: UseSheetDragOptions) {
  // null = not yet positioned; CSS falls back to the peek position.
  const [sheetTop, setSheetTop] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return null;
      const n = parseFloat(saved);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  });
  const dragRef = useRef<SheetDragState | null>(null);

  const bounds = useCallback(() => {
    const vh = window.innerHeight;
    return { min: vh * MIN_TOP_FRACTION, max: vh - peekPx(toolsPanelRef.current) };
  }, [toolsPanelRef]);

  const commit = useCallback((top: number) => {
    setSheetTop(top);
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.round(top)));
    } catch {
      /* private mode — position just won't persist */
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setSheetTop((cur) => {
        if (cur === null) return cur;
        const { min, max } = bounds();
        return Math.min(max, Math.max(min, cur));
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bounds]);

  const handleSheetDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth > 899) return;
    e.preventDefault();
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const panel = toolsPanelRef.current;
    const startTop = panel ? panel.getBoundingClientRect().top : bounds().max;
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY, startTop, moved: false };
    target.classList.add("is-dragging");
  }, [bounds, toolsPanelRef]);

  const handleSheetDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 3) drag.moved = true;
    const { min, max } = bounds();
    const next = Math.min(max, Math.max(min, drag.startTop + dy));
    // Write straight to the node during the gesture. Going through React state
    // here would re-render the whole workshop on every pointermove.
    toolsPanelRef.current?.style.setProperty("--sheet-top", `${next}px`);
  }, [bounds, toolsPanelRef]);

  const handleSheetDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const target = e.currentTarget;
    try { target.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    target.classList.remove("is-dragging");
    dragRef.current = null;

    const { min, max } = bounds();
    if (!drag.moved) {
      // A tap, not a drag: toggle between peeking and a comfortable working height.
      const atRest = Math.abs((toolsPanelRef.current?.getBoundingClientRect().top ?? max) - max) < 4;
      commit(atRest ? Math.max(min, window.innerHeight * 0.42) : max);
      return;
    }
    const dy = e.clientY - drag.startY;
    commit(Math.min(max, Math.max(min, drag.startTop + dy)));
  }, [bounds, commit, toolsPanelRef]);

  // React owns the value between gestures. Clamping happens here rather than in a
  // state-setting effect: a position restored from localStorage may have been saved
  // on a taller viewport (rotation, or a different device), and writing the clamped
  // value straight to the node avoids a second render just to correct it.
  useEffect(() => {
    const panel = toolsPanelRef.current;
    if (!panel) return;
    if (sheetTop === null) {
      panel.style.removeProperty("--sheet-top");
      return;
    }
    const { min, max } = bounds();
    panel.style.setProperty("--sheet-top", `${Math.min(max, Math.max(min, sheetTop))}px`);
  }, [sheetTop, bounds, toolsPanelRef]);

  const coverage = sheetTop === null ? 0 : 1 - sheetTop / (window.innerHeight || 1);

  return {
    handleSheetDragStart,
    handleSheetDragMove,
    handleSheetDragEnd,
    /** True once the sheet covers enough of the screen to warrant a scrim. */
    sheetIsProminent: coverage > SCRIM_FRACTION,
    /** Drop the sheet back to its resting peek. */
    collapseSheet: useCallback(() => commit(bounds().max), [bounds, commit]),
  };
}
