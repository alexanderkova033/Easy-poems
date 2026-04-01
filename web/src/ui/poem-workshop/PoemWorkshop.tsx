import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FirstVisitHint } from "./FirstVisitHint";
import { PoemBodyEditor } from "./PoemBodyEditor";
import { TOOL_TABS } from "./ToolTabBar";
import { ToolsOverviewStrip } from "./ToolsOverviewStrip";
import { useToolTabListKeyboard } from "./useToolTabListKeyboard";
import { useWorkshopToolHotkeys } from "./useWorkshopToolHotkeys";
import { WorkshopToolPanels } from "./WorkshopToolPanels";
import { usePoemWorkshopModel } from "./usePoemWorkshopModel";
import { CommandPalette, toolTabActions, type CommandPaletteAction } from "./CommandPalette";
import { FindReplaceBar } from "./FindReplaceBar";
import "./PoemWorkshop.css";

function RailIcon({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <span className="workshop-rail-icon" aria-hidden title={title}>
      {children}
    </span>
  );
}

export function PoemWorkshop() {
  const m = usePoemWorkshopModel();
  const onToolTabKeyDown = useToolTabListKeyboard(m.toolTab, m.setToolTab);
  useWorkshopToolHotkeys(m.toolTab, m.setToolTab);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [goLineRaw, setGoLineRaw] = useState("");

  useEffect(() => {
    const lockScroll = isLibraryOpen || isExportOpen || isCmdkOpen;
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLibraryOpen, isExportOpen, isCmdkOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsCmdkOpen(true);
        return;
      }
      if (e.key.toLowerCase() === "f" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setFindMode("find");
        setIsFindOpen(true);
        return;
      }
      if (e.key.toLowerCase() === "h" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setFindMode("replace");
        setIsFindOpen(true);
        return;
      }
      if (e.key !== "Escape") return;
      setIsLibraryOpen(false);
      setIsExportOpen(false);
      setIsCmdkOpen(false);
      setIsFindOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const focusPoemTitle = () => {
    document.getElementById("poem-title")?.focus();
  };

  const printPoemText = useMemo(() => {
    const t = m.title.trim();
    const f = m.formNote.trim();
    return `${t ? `${t}\n\n` : ""}${f ? `${f}\n\n` : ""}${m.body}`;
  }, [m.body, m.formNote, m.title]);

  const cmdkActions = useMemo<CommandPaletteAction[]>(() => {
    return [
      {
        id: "library",
        title: "Open Library",
        keywords: "draft poem library",
        run: () => setIsLibraryOpen(true),
      },
      {
        id: "export",
        title: "Open Export",
        keywords: "export copy download",
        run: () => setIsExportOpen(true),
      },
      {
        id: "focus",
        title: isFocusMode ? "Exit focus mode" : "Enter focus mode",
        keywords: "focus distraction",
        run: () => setIsFocusMode((v) => !v),
      },
      {
        id: "new",
        title: "New draft",
        keywords: "new poem draft",
        run: () => m.newPoem(),
      },
      {
        id: "duplicate",
        title: "Duplicate draft",
        keywords: "copy duplicate poem draft",
        run: () => m.duplicatePoem(),
      },
      {
        id: "delete",
        title: "Delete current draft",
        keywords: "delete remove poem draft",
        run: () => m.deleteCurrentPoem(),
      },
      {
        id: "snapshot",
        title: "Save snapshot",
        keywords: "snapshot revision",
        run: () => m.saveSnapshot(),
      },
      ...toolTabActions({ openToolTab: m.setToolTab }),
      {
        id: "title",
        title: "Focus title",
        keywords: "title heading",
        run: () => focusPoemTitle(),
      },
      {
        id: "find",
        title: "Find in poem",
        keywords: "find search",
        run: () => {
          setFindMode("find");
          setIsFindOpen(true);
        },
      },
      {
        id: "replace",
        title: "Replace in poem",
        keywords: "replace search",
        run: () => {
          setFindMode("replace");
          setIsFindOpen(true);
        },
      },
      {
        id: "go-line",
        title: "Go to line",
        keywords: "go line jump",
        run: () => {
          m.setToolTab("lines");
          queueMicrotask(() => {
            document.getElementById("go-line-input")?.focus();
          });
        },
      },
    ];
  }, [focusPoemTitle, isFocusMode, m]);

  return (
    <div className={`poem-workshop ${isFocusMode ? "is-focus-mode" : ""}`}>
      <CommandPalette
        open={isCmdkOpen}
        onClose={() => setIsCmdkOpen(false)}
        actions={cmdkActions}
      />
      <header
        className={`topbar ${isFocusMode ? "is-focus" : ""}`}
        aria-label="Workshop header"
      >
        <div className="topbar-left">
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              Easy-poems
            </span>
            <span className="brand-sub">
              Local-only drafts. Export/copy when you want outside feedback.
            </span>
          </div>
        </div>

        <div className="topbar-center" aria-label="Draft selection">
          <label className="draft-library-label" htmlFor="draft-poem-select">
            Active draft
          </label>
          <select
            id="draft-poem-select"
            className="draft-library-select"
            value={m.activePoemId}
            onChange={(e) => m.selectPoem(e.target.value)}
          >
            {m.poemOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="topbar-right" aria-label="Workshop actions">
          <div className="topbar-title" aria-label="Current draft title">
            {m.title.trim() ? m.title.trim() : "Untitled"}
          </div>
          <div className="topbar-stats" role="status" aria-live="polite">
            <span className="topbar-stat">
              <span className="topbar-stat-k">{m.docStats.totalWords}</span>
              <span className="topbar-stat-l">Words</span>
            </span>
            <span className="topbar-stat">
              <span className="topbar-stat-k">{m.docStats.totalLines}</span>
              <span className="topbar-stat-l">Lines</span>
            </span>
          </div>
          <span className="topbar-saved" aria-live="polite">
            <span className={`save-dot ${m.savedFlash ? "is-on" : ""}`} aria-hidden />
            Saved
          </span>
          {isFocusMode ? (
            <button
              type="button"
              className="small-btn topbar-focus-exit-btn"
              onClick={() => setIsFocusMode(false)}
              aria-label="Exit focus mode and show tools"
              title="Exit focus mode"
            >
              Show tools
            </button>
          ) : null}
        </div>
      </header>

      <FirstVisitHint />

      {m.persistenceError ? (
        <div
          className="persistence-banner"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="persistence-banner-text">{m.persistenceError}</p>
          <button
            type="button"
            className="small-btn persistence-banner-dismiss"
            onClick={m.dismissPersistenceError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {m.importNotice ? (
        <div
          className="import-notice-banner"
          role="status"
          aria-live="polite"
        >
          <p className="import-notice-text">{m.importNotice}</p>
          <button
            type="button"
            className="small-btn import-notice-dismiss"
            onClick={m.dismissImportNotice}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {isLibraryOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsLibraryOpen(false);
          }}
        >
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Draft library"
          >
            <div className="drawer-head">
              <h2 className="drawer-title">Library</h2>
              <button
                type="button"
                className="small-btn"
                onClick={() => setIsLibraryOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="drawer-block">
              <div className="drawer-actions">
                <button
                  type="button"
                  className="small-btn small-btn-primary"
                  onClick={() => {
                    m.newPoem();
                    setIsLibraryOpen(false);
                  }}
                >
                  New draft
                </button>
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => {
                    m.duplicatePoem();
                    setIsLibraryOpen(false);
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="small-btn danger-btn"
                  onClick={() => {
                    m.deleteCurrentPoem();
                    setIsLibraryOpen(false);
                  }}
                >
                  Delete
                </button>
              </div>
              <p className="drawer-note">
                Drafts and snapshots stay in this browser unless you export them.
              </p>
            </div>

            <div className="drawer-block">
              <h3 className="drawer-subtitle">Drafts</h3>
              <ul className="draft-list" aria-label="Drafts in library">
                {m.poemOptions.map((o) => {
                  const meta = m.draftMeta[o.id] ?? {};
                  const tags = (meta.tags ?? []).join(", ");
                  const isActive = o.id === m.activePoemId;
                  return (
                    <li key={o.id} className={`draft-item ${isActive ? "is-active" : ""}`}>
                      <div className="draft-item-row">
                        <button
                          type="button"
                          className={`pin-btn ${meta.pinned ? "is-on" : ""}`}
                          onClick={() => m.togglePinned(o.id)}
                          aria-pressed={Boolean(meta.pinned)}
                          title={meta.pinned ? "Unpin" : "Pin"}
                        >
                          {meta.pinned ? "★" : "☆"}
                        </button>
                        <button
                          type="button"
                          className="draft-open-btn"
                          onClick={() => {
                            m.selectPoem(o.id);
                            setIsLibraryOpen(false);
                          }}
                          aria-current={isActive ? "true" : undefined}
                          title="Open this draft"
                        >
                          {o.label}
                        </button>
                      </div>
                      <div className="draft-item-edit">
                        <label className="draft-edit-field">
                          Label
                          <input
                            type="text"
                            value={meta.label ?? ""}
                            onChange={(e) => m.setDraftLabel(o.id, e.target.value)}
                            placeholder="Optional display name"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </label>
                        <label className="draft-edit-field">
                          Tags
                          <input
                            type="text"
                            value={tags}
                            onChange={(e) =>
                              m.setDraftTags(
                                o.id,
                                e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              )
                            }
                            placeholder="comma, separated"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="drawer-note">
                Pinned drafts stay at the top; drafts also sort by last opened.
              </p>
            </div>

            <div className="drawer-block">
              <h3 className="drawer-subtitle">Backup</h3>
              <div className="drawer-actions">
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => void m.exportWorkshopBackup()}
                  title="Download all drafts and their snapshots as JSON"
                >
                  Export backup (JSON)
                </button>
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => void m.triggerImportBackup()}
                  title="Add poems from an Easy-poems backup JSON file"
                >
                  Import backup (JSON)
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isExportOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsExportOpen(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Export poem"
          >
            <div className="modal-head">
              <h2 className="modal-title">Export</h2>
              <button
                type="button"
                className="small-btn"
                onClick={() => setIsExportOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="small-btn" onClick={m.onDownloadTxt}>
                Download .txt
              </button>
              <button type="button" className="small-btn" onClick={m.onDownloadMd}>
                Download .md
              </button>
              <button
                type="button"
                className="small-btn small-btn-primary"
                onClick={() => void m.onDownloadDocx()}
              >
                Download Word (.docx)
              </button>
              <button
                type="button"
                className="small-btn"
                onClick={() => void m.onCopyMarkdown()}
                title="Copies your poem as Markdown: title becomes a # heading, form note is italic, each line stays a line—handy for Notion, GitHub, blogs, or ChatGPT."
              >
                Copy Markdown
              </button>
            </div>
            {m.docxExportErr ? (
              <p className="export-error compact" role="alert">
                {m.docxExportErr}
              </p>
            ) : null}
            <p className="modal-note">
              Export/copy sends text only where you choose—check the destination’s
              terms.
            </p>
          </section>
        </div>
      ) : null}

      <input
        ref={m.importInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={m.onImportBackupFile}
      />

      <div className="workshop-grid">
        <nav className={`workshop-rail ${isFocusMode ? "is-hidden" : ""}`} aria-label="Workshop shortcuts">
          <button
            type="button"
            className="rail-btn"
            onClick={() => setIsLibraryOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isLibraryOpen}
            title="Open Library"
          >
            <RailIcon title="Library">
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path
                  d="M5 19V6.5A2.5 2.5 0 0 1 7.5 4H20v14.5A1.5 1.5 0 0 1 18.5 20H7.5A2.5 2.5 0 0 1 5 17.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 7h9M8 10h9M8 13h6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </RailIcon>
            <span className="rail-label">Library</span>
          </button>

          <button
            type="button"
            className="rail-btn rail-btn-primary"
            onClick={() => setIsExportOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isExportOpen}
            title="Open Export"
          >
            <RailIcon title="Export">
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path
                  d="M12 14V3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 6.5 12 3l3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </RailIcon>
            <span className="rail-label">Export</span>
          </button>

          <button
            type="button"
            className="rail-btn"
            onClick={() => setIsFocusMode((v) => !v)}
            aria-pressed={isFocusMode}
            title={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
          >
            <RailIcon title="Focus">
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path
                  d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </RailIcon>
            <span className="rail-label">{isFocusMode ? "Unfocus" : "Focus"}</span>
          </button>
        </nav>

        <section
          className="editor-panel"
          aria-label="Poem editor"
          id="poem-draft"
        >
          <div className="editor-print-hide">
            <div className="editor-stack">
              <div className="editor-meta-grid" aria-label="Draft metadata">
                <div className="row title-row">
                  <label htmlFor="poem-title">Title</label>
                  <input
                    id="poem-title"
                    type="text"
                    value={m.title}
                    onChange={(e) => m.setTitle(e.target.value)}
                    placeholder="Optional"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="row title-row">
                  <label htmlFor="poem-form">Form (optional)</label>
                  <input
                    id="poem-form"
                    type="text"
                    value={m.formNote}
                    onChange={(e) => m.setFormNote(e.target.value)}
                    placeholder="e.g. sonnet, free verse"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>
              <FindReplaceBar
                editorView={m.editorViewRef.current}
                open={isFindOpen}
                mode={findMode}
                onClose={() => setIsFindOpen(false)}
              />
              <div className="row body-row">
                <div className="body-label-row">
                  <label id="poem-body-label" htmlFor="poem-body">
                    Poem{" "}
                    <span className="label-hint">(one line per line break)</span>
                  </label>
                </div>
                <div className="poem-editor-shell">
                  <PoemBodyEditor
                    id="poem-body"
                    aria-describedby="poem-body-hint"
                    value={m.body}
                    onChange={m.setBody}
                    editorViewRef={m.editorViewRef}
                    wordlist={m.wordlist}
                    spellMode={m.spellMode}
                    spellBump={m.spellBump}
                    jumpLine={m.jumpLine}
                    jumpBump={m.jumpBump}
                  />
                  <div
                    className={`poem-editor-copy-box ${m.quickCopyFlash ? "is-copied" : ""}`}
                  >
                    <div className="poem-editor-copy-slot-inner">
                      <button
                        type="button"
                        className="quick-copy-face quick-copy-face-icon"
                        onClick={() => void m.onQuickCopyPlain()}
                        title="Copy poem body as plain text (no title or form)"
                        aria-label="Copy poem body as plain text"
                        tabIndex={m.quickCopyFlash ? -1 : 0}
                        aria-hidden={m.quickCopyFlash}
                      >
                        <svg
                          className="quick-copy-svg"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </button>
                      <span
                        className="quick-copy-face quick-copy-face-done"
                        aria-live="polite"
                        aria-hidden={!m.quickCopyFlash}
                      >
                        Copied
                      </span>
                    </div>
                  </div>
                </div>
                <p id="poem-body-hint" className="field-hint">
                  Browser underlines off—only the workshop wavy mark for unknown
                  words.
                </p>
              </div>
              <div className="toolbar toolbar-saved">
                <span className="save-hint" aria-hidden />
              </div>
            </div>
          </div>
          <pre className="poem-print-fallback" aria-hidden="true">
            {printPoemText}
          </pre>
        </section>

        <aside
          className={`tools-panel ${isFocusMode ? "is-collapsed" : ""}`}
          aria-label="Tools"
          id="writing-tools"
        >
          <div className="tools-sticky-head">
            <div className="tools-head-row">
              <h2 className="tools-heading">Tools</h2>
              <div className="tools-head-actions" aria-label="Tools header actions">
                <form
                  className="go-line-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = parseInt(goLineRaw.trim(), 10);
                    if (!Number.isFinite(n) || n < 1) return;
                    m.goToLine(n);
                  }}
                >
                  <label className="go-line-label">
                    Go
                    <input
                      id="go-line-input"
                      value={goLineRaw}
                      onChange={(e) => setGoLineRaw(e.target.value)}
                      inputMode="numeric"
                      placeholder="Line"
                      aria-label="Go to line number"
                    />
                  </label>
                  <button type="submit" className="small-btn" title="Go to line">
                    ↵
                  </button>
                </form>
                <button
                  type="button"
                  className="small-btn tools-collapse-btn"
                  onClick={() => setIsFocusMode(true)}
                  title="Focus mode hides the tools panel"
                >
                  Focus
                </button>
              </div>
            </div>
            <nav
              className="tool-tabs"
              role="tablist"
              aria-label="Tool sections"
              onKeyDown={onToolTabKeyDown}
            >
              {TOOL_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tool-tab-${id}`}
                  aria-selected={m.toolTab === id}
                  aria-controls={`tool-panel-${id}`}
                  tabIndex={m.toolTab === id ? 0 : -1}
                  className={`tool-tab ${m.toolTab === id ? "active" : ""}`}
                  onClick={() => m.setToolTab(id)}
                >
                  <Icon />
                  <span className="tool-tab-label">{label}</span>
                </button>
              ))}
            </nav>
            <ToolsOverviewStrip
              docStats={m.docStats}
              spellHitCount={m.spellHits.length}
              wordlistReady={Boolean(m.wordlist)}
              goalEvaluation={m.goalEvaluation}
              repeatCount={m.repeated.length}
              activeTab={m.toolTab}
              onOpenTab={m.setToolTab}
            />
            <p className="tools-disclaimer tools-disclaimer-tabs">
              <span className="tools-hotkey-hint">
                <kbd className="kbd-hint">Ctrl</kbd>
                {" + "}
                <kbd className="kbd-hint">Alt</kbd>
                {" + "}
                <kbd className="kbd-hint">[</kbd> / <kbd className="kbd-hint">]</kbd>
                {" "}cycle tabs when not typing in the poem.
              </span>
              <span className="tools-disclaimer-sep" aria-hidden>
                {" "}
                ·{" "}
              </span>
              Syllables/meter/rhyme are <strong>rough</strong> (English heuristics).
            </p>
            <p className="tools-disclaimer tools-disclaimer-shortcuts muted small">
              <span className="tools-hotkey-hint">
                <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>
                {" + "}
                <kbd className="kbd-hint">K</kbd> command palette;{" "}
                <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>
                {" + "}
                <kbd className="kbd-hint">F</kbd> find;{" "}
                <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>
                {" + "}
                <kbd className="kbd-hint">H</kbd> replace.
              </span>
            </p>
          </div>

          <WorkshopToolPanels
            toolTab={m.toolTab}
            docStats={m.docStats}
            meterHints={m.meterHints}
            goals={m.goals}
            goalEvaluation={m.goalEvaluation}
            publication={m.publication}
            rhymeClusters={m.rhymeClusters}
            vowelTailClusters={m.vowelTailClusters}
            repeated={m.repeated}
            spellHits={m.spellHits}
            wordlist={m.wordlist}
            wordlistErr={m.wordlistErr}
            spellMode={m.spellMode}
            onSpellModeChange={m.setSpellMode}
            goToLine={m.goToLine}
            refreshSpell={m.refreshSpell}
            onSpellPersistenceError={m.onSpellPersistenceError}
            updateGoal={m.updateGoal}
            revisions={m.revisions}
            snapshotLabel={m.snapshotLabel}
            onSnapshotLabelChange={m.setSnapshotLabel}
            onSaveSnapshot={m.saveSnapshot}
            onRestoreRevision={m.restoreRevision}
            onDeleteRevision={m.deleteRevision}
            compareLeftId={m.compareLeftId}
            compareRightId={m.compareRightId}
            onCompareLeftChange={m.setCompareLeftId}
            onCompareRightChange={m.setCompareRightId}
            compareViewMode={m.compareViewMode}
            onCompareViewModeChange={m.setCompareViewMode}
            compareSnapshotOptions={m.compareSnapshotOptions}
            compareLeftBody={m.compareLeftBody}
            compareRightBody={m.compareRightBody}
            compareDiffRows={m.compareDiffRows}
            onOpenToolTab={m.setToolTab}
            focusPoemTitle={focusPoemTitle}
          />
        </aside>
      </div>

      <nav
        className={`mobile-actionbar ${isFocusMode ? "is-hidden" : ""}`}
        aria-label="Workshop actions"
      >
        <button
          type="button"
          className="mobile-action-btn"
          onClick={() => setIsLibraryOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isLibraryOpen}
        >
          Library
        </button>
        <button
          type="button"
          className="mobile-action-btn mobile-action-btn-primary"
          onClick={() => setIsExportOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isExportOpen}
        >
          Export
        </button>
        <button
          type="button"
          className="mobile-action-btn"
          onClick={() => setIsFocusMode((v) => !v)}
          aria-pressed={isFocusMode}
        >
          {isFocusMode ? "Unfocus" : "Focus"}
        </button>
      </nav>

      <footer className="privacy">
        <h2 className="privacy-title">Privacy</h2>
        <p>
          This app does not use analytics, ads, or third-party trackers. Your drafts,
          snapshots, goals, and personal spelling list stay in this browser unless you
          export or copy them out.
        </p>
        <p>
          Export or paste sends text only where you choose—check that site&apos;s terms.
        </p>
      </footer>
    </div>
  );
}
