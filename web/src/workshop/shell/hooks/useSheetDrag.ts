import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

/** Never cover more than this much of the screen — the poem stays partly visible. */
const MIN_TOP_FRACTION = 0.08;
/** Fallback peek height (px) if the CSS custom property cannot be read. */
const FALLBACK_PEEK_PX = 80;
/** Past this much coverage the sheet is the focus, so the scrim goes solid. */
const SCRIM_FRACTION = 0.55;
/** Within this of the bottom the sheet counts as stowed to the edge tab. */
const STOWED_SLACK_PX = 8;
/** px/ms past which a release counts as a flick rather than a slow drag. */
const FLICK_VELOCITY = 0.45;
/** Comfortable working height when opened by tap or upward flick. */
const OPEN_TOP_FRACTION = 0.42;

const STORAGE_KEY = "easy-poems:tools-sheet-top";

interface SheetDragState {
  pointerId: number;
  startY: number;
  startTop: number;
  lastY: number;
  lastT: number;
  velocity: number;
  moved: boolean;
}

interface UseSheetDragOptions {
  toolsPanelRef: MutableRefObject<HTMLElement | null>;
}

function readPeekPx(panel: HTMLElement | null): number {
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
 * writer drags it to whatever height suits them, rather than snapping to a
 * designer's idea of "half" or "full". Where they leave it is where it stays,
 * across reloads.
 *
 * Dragged (or flicked) all the way down it *stows*: the body slides off and only
 * a small tab stays on the edge. Deliberately not a full dismissal — a sheet you
 * can remove entirely is one you can lose — and the tab sits inset from the
 * corner so it doesn't compete with Android's back/home gesture zone.
 */
export function useSheetDrag({ toolsPanelRef }: UseSheetDragOptions) {
  // null = never positioned; CSS falls back to the resting peek.
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
  const [stowed, setStowed] = useState(false);
  const dragRef = useRef<SheetDragState | null>(null);

  const bounds = useCallback(() => {
    const vh = window.innerHeight;
    return { min: vh * MIN_TOP_FRACTION, max: vh - readPeekPx(toolsPanelRef.current) };
  }, [toolsPanelRef]);

  const commit = useCallback((top: number, opts?: { stow?: boolean }) => {
    setSheetTop(top);
    setStowed(Boolean(opts?.stow));
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

  const handleSheetDragStart = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (window.innerWidth > 899) return;
    // The whole header is the drag surface, so let real controls inside it win.
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const panel = toolsPanelRef.current;
    const startTop = panel ? panel.getBoundingClientRect().top : bounds().max;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startTop,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      moved: false,
    };
    target.classList.add("is-dragging");
  }, [bounds, toolsPanelRef]);

  const handleSheetDragMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 3) drag.moved = true;

    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (e.clientY - drag.lastY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = e.timeStamp;

    const { min, max } = bounds();
    const next = Math.min(max, Math.max(min, drag.startTop + dy));
    // Written straight to the node during the gesture — routing this through
    // React state would re-render the whole workshop on every pointermove.
    toolsPanelRef.current?.style.setProperty("--sheet-top", `${next}px`);
  }, [bounds, toolsPanelRef]);

  const handleSheetDragEnd = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const target = e.currentTarget;
    try { target.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    target.classList.remove("is-dragging");
    dragRef.current = null;

    const { min, max } = bounds();
    const openTop = Math.max(min, window.innerHeight * OPEN_TOP_FRACTION);

    if (!drag.moved) {
      // A tap: toggle between stowed/peeking and a working height.
      const cur = toolsPanelRef.current?.getBoundingClientRect().top ?? max;
      commit(cur >= max - STOWED_SLACK_PX ? openTop : max, { stow: false });
      return;
    }

    const landed = Math.min(max, Math.max(min, drag.startTop + (e.clientY - drag.startY)));

    // A downward flick stows it outright, so getting the sheet out of the way is
    // one gesture rather than a careful drag all the way to the bottom.
    if (drag.velocity > FLICK_VELOCITY) { commit(max, { stow: true }); return; }
    if (drag.velocity < -FLICK_VELOCITY) { commit(openTop, { stow: false }); return; }

    commit(landed, { stow: landed >= max - STOWED_SLACK_PX });
  }, [bounds, commit, toolsPanelRef]);

  // React owns the value between gestures. Clamping happens here rather than in a
  // state-setting effect: a position restored from localStorage may have been saved
  // on a taller viewport, and writing the clamped value straight to the node avoids
  // a second render just to correct it.
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
    sheetIsProminent: !stowed && coverage > SCRIM_FRACTION,
    /** True when stowed to the edge tab. */
    sheetIsStowed: stowed,
    /** Bring a stowed sheet back to a working height. */
    openSheet: useCallback(() => {
      const { min, max } = bounds();
      commit(Math.max(min, Math.min(max, window.innerHeight * OPEN_TOP_FRACTION)), { stow: false });
    }, [bounds, commit]),
    /** Drop the sheet back to its resting peek. */
    collapseSheet: useCallback(() => commit(bounds().max, { stow: false }), [bounds, commit]),
  };
}
