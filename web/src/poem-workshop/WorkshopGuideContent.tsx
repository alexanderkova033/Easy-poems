import { useState } from "react";

const STEPS = [
  {
    id: "welcome",
    title: "Your poem desk",
    visual: "welcome",
    body: (
      <>
        <p className="guide-step-text">
          Easy Poems is a distraction-free space where your draft and your
          analysis tools live side by side. Everything you write is saved
          automatically in this browser — no accounts, no cloud, nothing
          leaves your device unless you choose to export.
        </p>
        <p className="guide-step-text">
          This guide takes two minutes and shows you the five things that
          matter most. Use the arrows below to step through, or press{" "}
          <kbd className="kbd-hint">Esc</kbd> to skip.
        </p>
      </>
    ),
  },
  {
    id: "layout",
    title: "Three zones",
    visual: "layout",
    body: (
      <>
        <p className="guide-step-text">
          The screen is divided into three zones:
        </p>
        <div className="guide-zones">
          <div className="guide-zone guide-zone-header">
            <span className="guide-zone-label">Header</span>
            <span className="guide-zone-desc">
              Draft picker, Library, counts, Commands, Fonts, Backdrop
            </span>
          </div>
          <div className="guide-zone guide-zone-editor">
            <span className="guide-zone-label">Your poem</span>
            <span className="guide-zone-desc">
              Title + body — type here, autosaves every keystroke
            </span>
          </div>
          <div className="guide-zone guide-zone-tools">
            <span className="guide-zone-label">Tools</span>
            <span className="guide-zone-desc">
              Live analysis — updates as you write, never interrupts
            </span>
          </div>
        </div>
        <p className="guide-step-text guide-step-text-sm">
          On a phone, swipe left to see Tools and right to return to the poem.
        </p>
      </>
    ),
  },
  {
    id: "tools",
    title: "The tools panel",
    visual: "tools",
    body: (
      <>
        <p className="guide-step-text">
          Tools are grouped into two buckets — switch between them with the
          tabs at the top of the panel.
        </p>
        <div className="guide-tools-grid">
          <div className="guide-tools-bucket">
            <span className="guide-tools-bucket-name">Overview</span>
            <div className="guide-tools-items">
              <span className="guide-tool-chip guide-tool-chip-issues">Issues</span>
              <span className="guide-tool-chip guide-tool-chip-totals">Totals</span>
              <span className="guide-tool-chip guide-tool-chip-spell">Spell</span>
              <span className="guide-tool-chip guide-tool-chip-lines">Lines</span>
              <span className="guide-tool-chip guide-tool-chip-goals">Goals</span>
              <span className="guide-tool-chip guide-tool-chip-checklist">Ready</span>
              <span className="guide-tool-chip guide-tool-chip-snapshots">Snapshots</span>
            </div>
          </div>
          <div className="guide-tools-bucket">
            <span className="guide-tools-bucket-name">Sound</span>
            <div className="guide-tools-items">
              <span className="guide-tool-chip guide-tool-chip-meter">Meter</span>
              <span className="guide-tool-chip guide-tool-chip-rhyme">Rhyme</span>
              <span className="guide-tool-chip guide-tool-chip-repeat">Repeats</span>
            </div>
          </div>
        </div>
        <p className="guide-step-text guide-step-text-sm">
          The coloured pill strip under the bucket tabs jumps straight to a
          specific tool. Rhyme scheme letters appear beside the editor as you
          write.
        </p>
      </>
    ),
  },
  {
    id: "drafts",
    title: "Drafts & snapshots",
    visual: "drafts",
    body: (
      <>
        <p className="guide-step-text">
          You can keep as many drafts as you like. Use <strong>Library</strong>{" "}
          (in the header or rail) to create, duplicate, pin, or archive them.
        </p>
        <div className="guide-feature-rows">
          <div className="guide-feature-row">
            <span className="guide-feature-icon">📸</span>
            <span>
              <strong>Snapshots</strong> — save a named revision point before a
              big edit. Compare any two versions line-by-line in the Snapshots
              tab.
            </span>
          </div>
          <div className="guide-feature-row">
            <span className="guide-feature-icon">💾</span>
            <span>
              <strong>Backup</strong> — export all drafts + snapshots as a
              single JSON file from Library or Export. Import it on another
              device or browser.
            </span>
          </div>
          <div className="guide-feature-row">
            <span className="guide-feature-icon">📄</span>
            <span>
              <strong>Export</strong> — download as .txt, .md, or Word (.docx),
              or copy as Markdown for Notion, blogs, or email.
            </span>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "commands",
    title: "Find anything fast",
    visual: "commands",
    body: (
      <>
        <p className="guide-step-text">
          Press{" "}
          <kbd className="kbd-hint">⌘</kbd>
          <kbd className="kbd-hint">K</kbd>{" "}
          (or <kbd className="kbd-hint">Ctrl</kbd>
          <kbd className="kbd-hint">K</kbd>) to open{" "}
          <strong>Commands</strong> — a search bar that can do anything:
          switch tools, open export, enter focus mode, load templates, and more.
          If you forget a keyboard shortcut, just type its name.
        </p>
        <div className="guide-cmd-demo" aria-hidden>
          <div className="guide-cmd-bar">
            <span className="guide-cmd-icon">⌘</span>
            <span className="guide-cmd-input">focus mode</span>
          </div>
          <div className="guide-cmd-results">
            <div className="guide-cmd-result guide-cmd-result-active">
              <span className="guide-cmd-result-name">Enter focus mode</span>
              <span className="guide-cmd-result-hint">Hide tools for distraction-free writing</span>
            </div>
            <div className="guide-cmd-result">
              <span className="guide-cmd-result-name">Save snapshot</span>
            </div>
            <div className="guide-cmd-result">
              <span className="guide-cmd-result-name">Reading view</span>
            </div>
          </div>
        </div>
        <p className="guide-step-text guide-step-text-sm">
          Other shortcuts: <kbd className="kbd-hint">Ctrl</kbd>+
          <kbd className="kbd-hint">F</kbd> find in poem ·{" "}
          <kbd className="kbd-hint">Esc</kbd> close any dialog.
        </p>
      </>
    ),
  },
  {
    id: "done",
    title: "You are ready",
    visual: "done",
    body: (
      <>
        <p className="guide-step-text">
          That is the whole map. Open the poem, start writing, and let the
          tools run quietly in the background. Nothing demands your attention
          until you are ready to look.
        </p>
        <div className="guide-tips">
          <p className="guide-tips-title">A few useful things to try first:</p>
          <ul className="guide-tips-list">
            <li>Type a few lines and watch the rhyme scheme appear below the editor</li>
            <li>Open <strong>Sound → Meter</strong> to see stress patterns</li>
            <li>Press <kbd className="kbd-hint">⌘</kbd><kbd className="kbd-hint">K</kbd> and search "templates" for haiku, sonnet starters</li>
            <li>When a draft feels finished, use <strong>Export → Word</strong> to save it properly</li>
          </ul>
        </div>
      </>
    ),
  },
] as const;

export function WorkshopGuideContent({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="guide-flow">
      {/* Progress dots */}
      <div className="guide-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`guide-progress-dot ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
            onClick={() => setStep(i)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            aria-current={i === step ? "step" : undefined}
          />
        ))}
      </div>

      {/* Visual illustration */}
      <div className={`guide-visual guide-visual-${current.visual}`} aria-hidden>
        <GuideVisual id={current.visual} />
      </div>

      {/* Step content */}
      <div className="guide-step-body">
        <h3 className="guide-step-title">{current.title}</h3>
        {current.body}
      </div>

      {/* Navigation */}
      <div className="guide-nav">
        {!isFirst ? (
          <button
            type="button"
            className="small-btn guide-nav-back"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="guide-nav-right">
          {onClose && (
            <button
              type="button"
              className="small-btn guide-nav-skip"
              onClick={onClose}
            >
              {isLast ? "Close" : "Skip"}
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              className="small-btn small-btn-primary guide-nav-next"
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GuideVisual({ id }: { id: string }) {
  switch (id) {
    case "welcome":
      return (
        <div className="guide-vis-welcome">
          <div className="guide-vis-leaf">
            <svg viewBox="0 0 56 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M42 6C50 12 54 26 40 45L30 60L28 69L26 60C20 45 22 27 42 6Z" fill="currentColor" opacity="0.18" />
              <path d="M42 6C28 30 27 48 28 69" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
              <path d="M26 60L28 69" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <div className="guide-vis-lines">
            {[80, 65, 72, 55, 70].map((w, i) => (
              <div key={i} className="guide-vis-line" style={{ width: `${w}%`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
      );
    case "layout":
      return (
        <div className="guide-vis-layout">
          <div className="guide-vis-layout-bar" />
          <div className="guide-vis-layout-body">
            <div className="guide-vis-layout-editor">
              {[75, 60, 68, 50].map((w, i) => (
                <div key={i} className="guide-vis-layout-line" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="guide-vis-layout-tools">
              <div className="guide-vis-layout-tool-tab" />
              <div className="guide-vis-layout-tool-tab" />
              <div className="guide-vis-layout-tool-tab" />
              {[90, 70, 80].map((w, i) => (
                <div key={i} className="guide-vis-layout-tool-row" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      );
    case "tools":
      return (
        <div className="guide-vis-tools">
          <div className="guide-vis-tools-buckets">
            <div className="guide-vis-tools-bucket guide-vis-tools-bucket-active">Overview</div>
            <div className="guide-vis-tools-bucket">Sound</div>
          </div>
          <div className="guide-vis-tools-chips">
            {["Issues", "Totals", "Spell", "Lines"].map((n) => (
              <div key={n} className="guide-vis-tools-chip">{n}</div>
            ))}
          </div>
          <div className="guide-vis-tools-panel">
            {[85, 60, 78, 55, 70, 40].map((w, i) => (
              <div key={i} className="guide-vis-tools-row" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      );
    case "drafts":
      return (
        <div className="guide-vis-drafts">
          {["Ode to autumn", "Sonnet draft 3", "Haiku series"].map((title, i) => (
            <div key={i} className={`guide-vis-draft-card ${i === 1 ? "is-active" : ""}`}>
              <span className="guide-vis-draft-title">{title}</span>
              {i === 0 && <span className="guide-vis-draft-pin">📌</span>}
            </div>
          ))}
        </div>
      );
    case "commands":
      return (
        <div className="guide-vis-cmdk">
          <div className="guide-vis-cmdk-pill">
            <span className="guide-vis-cmdk-key">⌘</span>
            <span className="guide-vis-cmdk-sep">+</span>
            <span className="guide-vis-cmdk-key">K</span>
          </div>
          <div className="guide-vis-cmdk-arrow">↓</div>
          <div className="guide-vis-cmdk-bar">
            <span className="guide-vis-cmdk-cursor" />
          </div>
        </div>
      );
    case "done":
      return (
        <div className="guide-vis-done">
          <div className="guide-vis-done-leaf">
            <svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M36 5C43 10 46 22 34 38L25 52L24 59L23 52C18 38 20 23 36 5Z" fill="currentColor" opacity="0.22" />
              <path d="M36 5C24 26 23 42 24 59" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
              <path fill="currentColor" opacity="0.28" d="M4 38C4 38 16 32 24 38C32 44 36 42 42 38" strokeWidth="1" />
            </svg>
          </div>
          <div className="guide-vis-done-check">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <path d="M9 16.5L13.5 21L23 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      );
    default:
      return null;
  }
}
