import { useEffect } from "react";
import { isTypingInField } from "@/workshop/hints/keyboard-field-target";
import {
  tabsForBucket,
  toolTabBucket,
  type ToolTab,
} from "@/workshop/shell/workshop-helpers";

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
