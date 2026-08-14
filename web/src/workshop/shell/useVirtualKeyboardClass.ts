import { useEffect } from "react";

/** Never compensate for more than this. A gap larger than a browser toolbar is
 *  the soft keyboard, or a transient measurement mid-animation, and padding the
 *  sheets by it would leave a hole the size of half the screen. */
const MAX_CHROME_GAP_PX = 140;

/**
 * Toggles a `vp-keyboard-open` class on `<html>` when the visual viewport
 * shrinks (mobile soft keyboard up). Used by the layout to hide the topbar
 * while typing so the editor keeps full height.
 *
 * Also publishes `--vv-bottom-gap`: how much of the layout viewport is hidden
 * behind the browser's own bottom UI right now.
 *
 * That gap is not a detail. A phone browser's layout viewport (window.innerHeight,
 * and everything sized from it — `100%` inside a `position: fixed; inset: 0`
 * container, `vh`, `dvh` at its largest) extends UNDER the bottom toolbar, while
 * the visual viewport is what the reader can actually see. Anything the app pins
 * to the bottom of a sheet therefore lands behind that toolbar: reachable in
 * principle, invisible in practice. The toolbar also comes and goes as the page
 * scrolls, which is why it looks intermittent.
 */
export function useVirtualKeyboardClass(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const handler = () => {
      const open = vv.height < window.innerHeight * 0.78;
      root.classList.toggle("vp-keyboard-open", open);
      // While the keyboard is up the gap IS the keyboard, which the layout
      // handles on its own terms — report nothing rather than something wrong.
      const raw = open ? 0 : window.innerHeight - vv.height - vv.offsetTop;
      const gap = Math.min(Math.max(Math.round(raw), 0), MAX_CHROME_GAP_PX);
      root.style.setProperty("--vv-bottom-gap", `${gap}px`);
    };
    handler();
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
      root.classList.remove("vp-keyboard-open");
      root.style.removeProperty("--vv-bottom-gap");
    };
  }, []);
}
