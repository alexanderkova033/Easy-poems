import type { JSX, ReactNode } from "react";
import type { ToolTab } from "./workshop-helpers";

function IconTabTotals() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M5 5.5h5.5M5 12h14M5 18.5h9M16.5 8v6.5m-3.25-3.25h6.5"
      />
    </svg>
  );
}

function IconTabGoals() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconTabChecklist() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
        d="M8 6.5h11M8 12h11M8 17.5h11M5.25 6.5l.9 1 1.35-2M5.25 12l.9 1 1.35-2M5.25 17.5l.9 1 1.35-2"
      />
    </svg>
  );
}

function IconTabLines() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
        d="M5 6.5h3v3H5zm6 0h9m-9 5.5h9m-9 5.5h9M5 15v3h3v-3z"
      />
    </svg>
  );
}

function IconTabMeter() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 17.5V8.5l3 5 3-7 3 5 3-5v9"
      />
    </svg>
  );
}

function IconTabRhyme() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M8.3 10.2a3.6 3.6 0 104.8 4.4M15.7 13.8a3.6 3.6 0 10-4.8-4.4"
      />
    </svg>
  );
}

function IconTabRepeat() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 5.5h3v3M8 18.5H5v-3m0-5.5a7.5 7.5 0 0112.85-5.3M19 12a7.5 7.5 0 01-12.85 5.3"
      />
    </svg>
  );
}

function IconTabSpell() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 18.5V6.5l5.5 3.2L16 6.5v12M11 9.2V19"
      />
    </svg>
  );
}

function IconTabSnapshots() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 7.5h4l1-2h5l1 2h2.5a1 1 0 011 1v10a1 1 0 01-1 1h-15a1 1 0 01-1-1v-10a1 1 0 011-1z"
      />
      <circle cx="12" cy="13.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconTabFeedback() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10.5h8M8 14h5.5M5 18.5l2-3.5H18a1.5 1.5 0 001.5-1.5V7A1.5 1.5 0 0018 5.5H6A1.5 1.5 0 004.5 7v10.5L5 18.5z"
      />
    </svg>
  );
}

function IconTabShortcuts() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.5h9M7.5 12h6M7.5 15.5h8M5 8.5h.01M5 12h.01M5 15.5h.01"
      />
    </svg>
  );
}

/** Order tuned for flow: counts → spelling → line work → polish → versions → external help */
export const TOOL_TABS: {
  id: ToolTab;
  label: string;
  Icon: () => JSX.Element;
}[] = [
  { id: "totals", label: "Totals", Icon: IconTabTotals },
  { id: "spell", label: "Spell", Icon: IconTabSpell },
  { id: "lines", label: "Lines", Icon: IconTabLines },
  { id: "meter", label: "Meter", Icon: IconTabMeter },
  { id: "rhyme", label: "Sound", Icon: IconTabRhyme },
  { id: "repeat", label: "Repeats", Icon: IconTabRepeat },
  { id: "goals", label: "Goals", Icon: IconTabGoals },
  { id: "checklist", label: "Ready", Icon: IconTabChecklist },
  { id: "snapshots", label: "Snapshots", Icon: IconTabSnapshots },
  { id: "feedback", label: "ChatGPT", Icon: IconTabFeedback },
  { id: "shortcuts", label: "Shortcuts", Icon: IconTabShortcuts },
];

export function LiveSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="tool-heading-live">
      <span className="live-dot" aria-hidden />
      <span className="tool-heading-live-text">{children}</span>
      <span className="live-badge">From draft</span>
    </h3>
  );
}
