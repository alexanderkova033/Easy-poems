import { useCallback, useEffect, useState } from "react";

/**
 * Browser fullscreen, for reclaiming the phone's browser chrome.
 *
 * The workshop pins the viewport on mobile (html/body overflow: hidden — the
 * editor and tools do their own scrolling), and Android Chrome only retracts its
 * address bar and bottom toolbar when the ROOT scroller moves. So in the
 * workshop those two bars are permanent: ~110px of a ~730px screen, gone, and no
 * amount of CSS gets it back. Undoing the pin has been tried and reverted (see
 * the note above the pin in index.css) — CodeMirror needs a definite height all
 * the way down the flex chain.
 *
 * Fullscreen is the one thing that actually removes them. It is a real user
 * gesture away, so it has to be a control rather than something applied
 * automatically.
 *
 * `supported` is false on iOS Safari, which allows fullscreen for <video> only —
 * the control hides there rather than offering a button that does nothing.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement),
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    // Failures are swallowed on purpose: requestFullscreen rejects when the call
    // isn't tied to a user gesture or the browser refuses it outright, and
    // there's nothing useful to say about it beyond the bars staying put.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const supported = typeof document !== "undefined"
    && typeof document.documentElement.requestFullscreen === "function";

  return {
    supported,
    isFullscreen,
    /** True when the page is already running as an installed app, in which case
     *  there is no browser chrome left to reclaim and the control has nothing to
     *  offer. Covers both the standard display-mode query and iOS's own flag. */
    installed: typeof window !== "undefined"
      && (window.matchMedia?.("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true),
    toggle,
  };
}
