import { FirstVisitHint } from "./FirstVisitHint";
import { PoemBodyEditor } from "./PoemBodyEditor";
import { TOOL_TABS } from "./ToolTabBar";
import { ToolsOverviewStrip } from "./ToolsOverviewStrip";
import { useToolTabListKeyboard } from "./useToolTabListKeyboard";
import { useWorkshopToolHotkeys } from "./useWorkshopToolHotkeys";
import { WorkshopToolPanels } from "./WorkshopToolPanels";
import { usePoemWorkshopModel } from "./usePoemWorkshopModel";
import "./PoemWorkshop.css";

export function PoemWorkshop() {
  const m = usePoemWorkshopModel();
  const onToolTabKeyDown = useToolTabListKeyboard(m.toolTab, m.setToolTab);
  useWorkshopToolHotkeys(m.toolTab, m.setToolTab);

  const focusPoemTitle = () => {
    document.getElementById("poem-title")?.focus();
  };

  const printPoemText = `${m.title.trim() ? `${m.title.trim()}\n\n` : ""}${m.formNote.trim() ? `${m.formNote.trim()}\n\n` : ""}${m.body}`;

  return (
    <div className="poem-workshop">
      <header className="hero">
        <h1>Easy-poems</h1>
        <p className="tagline">
          Local draft in this tab—export or paste out when you want feedback elsewhere.
        </p>
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

      <div className="draft-library-bar" aria-label="Poem drafts in this browser">
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
        <div className="draft-library-actions">
          <button type="button" className="small-btn" onClick={m.newPoem}>
            New draft
          </button>
          <button type="button" className="small-btn" onClick={m.duplicatePoem}>
            Duplicate
          </button>
          <button type="button" className="small-btn" onClick={m.deleteCurrentPoem}>
            Delete
          </button>
          <button
            type="button"
            className="small-btn"
            onClick={m.exportWorkshopBackup}
            title="Download all drafts and their snapshots as JSON"
          >
            Export backup
          </button>
          <button
            type="button"
            className="small-btn"
            onClick={m.triggerImportBackup}
            title="Add poems from an Easy-poems backup JSON file"
          >
            Import backup
          </button>
        </div>
        <input
          ref={m.importInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={m.onImportBackupFile}
        />
      </div>

      <div className="workshop-grid">
        <section
          className="editor-panel"
          aria-label="Poem editor"
          id="poem-draft"
        >
          <div className="editor-print-hide">
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
          <div className="row body-row">
            <div className="body-label-row">
              <label id="poem-body-label" htmlFor="poem-body">
                Poem <span className="label-hint">(one line per line break)</span>
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
              Browser underlines off—only the workshop wavy mark for unknown words.
            </p>
          </div>
          <div className="toolbar toolbar-saved">
            <span
              className={`save-hint ${m.savedFlash ? "visible" : ""}`}
              aria-live="polite"
            >
              Saved
            </span>
          </div>
          <div className="export-row" id="export-area" aria-label="Export poem">
            <span className="export-label">Export</span>
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
              aria-label="Copy poem as Markdown for notes, GitHub, or ChatGPT"
            >
              Copy Markdown
            </button>
            <span
              className={`export-copied ${m.copyExportFlash ? "visible" : ""}`}
              aria-live="polite"
            >
              Copied
            </span>
            {m.docxExportErr ? (
              <p className="export-error compact" role="alert">
                {m.docxExportErr}
              </p>
            ) : null}
          </div>
          </div>
          <pre className="poem-print-fallback" aria-hidden="true">
            {printPoemText}
          </pre>
        </section>

        <aside
          className="tools-panel"
          aria-label="Tools"
          id="writing-tools"
        >
          <h2 className="tools-heading">Tools</h2>
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
            Syllables, meter, and rhyme hints are <strong>rough</strong>—English
            heuristics only.
          </p>

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
