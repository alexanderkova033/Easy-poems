import { useEffect, useState } from "react";

/** The breakpoint the mobile CSS uses (`@media (max-width: 899px)`). */
const NARROW_QUERY = "(max-width: 899px)";

function matches(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.matchMedia === "function"
    ? window.matchMedia(NARROW_QUERY).matches
    : window.innerWidth <= 899;
}

/**
 * True on phone-width viewports, kept in sync with rotation and resize.
 *
 * Layout decisions that mirror a CSS breakpoint should read this rather than
 * sampling `window.innerWidth` once, so turning the phone sideways doesn't leave
 * the component rendering the other form factor's layout.
 */
export function useIsNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(matches);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    // No re-sync on mount: the useState initializer already read this same query
    // during render (client-only tree, so it sees the real viewport), and every
    // later crossing arrives via the change event. Setting state here as well
    // would only add a cascading render on every mount.
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return narrow;
}
