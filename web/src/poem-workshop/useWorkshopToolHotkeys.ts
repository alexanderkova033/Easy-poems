import { useEffect } from "react";
import {
  tabsForBucket,
  toolTabBucket,
  type ToolTab,
} from "./workshop-helpers";

function isTypingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.closest(".cm-editor")) return true;
  if (el.isContentEditable) return true;
  return false;
}

/** Ctrl+Alt+[ / ] cycles tool tabs (skipped while typing in the poem or a form field). */
export function useWorkshopToolHotkeys(
  toolTab: ToolTab,
  setToolTab: (t: ToolTab) => void,
) {
  useEffect(() => {
    const ids = tabsForBucket(toolTabBucket(toolTab));
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey) return;
      if (e.key !== "[" && e.key !== "]") return;
      if (isTypingInField(e.target)) return;
      e.preventDefault();
      const i = ids.indexOf(toolTab);
      if (i < 0) return;
      const delta = e.key === "]" ? 1 : -1;
      setToolTab(ids[(i + delta + ids.length) % ids.length]!);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [toolTab, setToolTab]);
}
