import type { JSX, ReactNode } from "react";
import type { ToolTab } from "./workshop-helpers";

function IconTabIssues() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v6m0 3.5h.01M9.8 4.5h4.4L18 8.3v7.4l-3.8 3.8H9.8L6 15.7V8.3l3.8-3.8z"
      />
    </svg>
  );
}

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

/** Order tuned for flow: triage → counts → spelling → line work → polish → versions → external help */
export const TOOL_TABS: {
  id: ToolTab;
  label: string;
  Icon: () => JSX.Element;
}[] = [
  { id: "issues", label: "Issues", Icon: IconTabIssues },
  { id: "totals", label: "Totals", Icon: IconTabTotals },
  { id: "spell", label: "Spell", Icon: IconTabSpell },
  { id: "lines", label: "Lines", Icon: IconTabLines },
  { id: "meter", label: "Meter", Icon: IconTabMeter },
  { id: "rhyme", label: "Sound", Icon: IconTabRhyme },
  { id: "repeat", label: "Repeats", Icon: IconTabRepeat },
  { id: "goals", label: "Goals", Icon: IconTabGoals },
  { id: "checklist", label: "Ready", Icon: IconTabChecklist },
  { id: "snapshots", label: "Snapshots", Icon: IconTabSnapshots },
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
