import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  applyAppearance,
  loadAppearance,
  saveAppearance,
  type AppearanceSettings,
} from "./appearance";
import { AppearanceFormFields } from "./AppearanceFormFields";
import { BackgroundPicker } from "./BackgroundPicker";
import { FirstVisitHint } from "./FirstVisitHint";
import { FeedbackWidget } from "./FeedbackWidget";
import { PoemBodyEditor } from "./PoemBodyEditor";
import { TOOL_TABS } from "./ToolTabBar";
import { ToolsOverviewStrip } from "./ToolsOverviewStrip";
import { useToolTabListKeyboard } from "./useToolTabListKeyboard";
import { useWorkshopToolHotkeys } from "./useWorkshopToolHotkeys";
import { WorkshopToolPanels } from "./WorkshopToolPanels";
import type { DraftMeta } from "@/draft-library/library-meta";
import type { PoemRecord } from "@/draft-library/local-draft-library";
import { usePoemWorkshopModel } from "./usePoemWorkshopModel";
import { AiAnalysis } from "./AiAnalysis";
import { FormatToolbar } from "./FormatToolbar";
import { WordLookupPopup } from "./WordLookupPopup";
import { TemplatesModal } from "./TemplatesModal";
import { ReadingModeModal } from "./ReadingModeModal";
import { CommandPalette, toolTabActions, type CommandPaletteAction } from "./CommandPalette";
import { FindReplaceBar } from "./FindReplaceBar";
import {
  TOOL_BUCKET_LABEL,
  TOOL_BUCKET_ORDER,
  defaultTabForBucket,
  tabsForBucket,
  toolTabBucket,
} from "./workshop-helpers";
import { STORAGE_KEY_SHOW_LINE_SYLLABLES } from "@/shared/storage-keys";
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
  const bucketTabs = tabsForBucket(toolTabBucket(m.toolTab));
  const onToolTabKeyDown = useToolTabListKeyboard(
    m.toolTab,
    m.setToolTab,
    bucketTabs,
  );
  useWorkshopToolHotkeys(m.toolTab, m.setToolTab);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [librarySort, setLibrarySort] = useState<
    "recent" | "title" | "updated"
  >("recent");
  const [libraryShowArchived, setLibraryShowArchived] = useState(false);
  const [mobileToolsExpanded, setMobileToolsExpanded] = useState(true);
  const [issueHighlight, setIssueHighlight] = useState<[number, number] | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [showLineSyllables, setShowLineSyllables] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SHOW_LINE_SYLLABLES);
      if (raw === "0" || raw === "false") return false;
    } catch {
      /* ignore */
    }
    return true;
  });
  const workshopGridRef = useRef<HTMLDivElement | null>(null);
  const [appearance, setAppearance] = useState<AppearanceSettings>(() =>
    loadAppearance(),
  );
  const overlayOpenCountPrev = useRef(0);
  const overlayReturnFocusRef = useRef<HTMLElement | null>(null);
  const toolsPanelRef = useRef<HTMLElement | null>(null);
  const lastPanelScrollRef = useRef<number>(0);

  const overlayOpenCount =
    Number(isLibraryOpen) +
    Number(isExportOpen) +
    Number(isAppearanceOpen) +
    Number(isBackgroundOpen) +
    Number(isCmdkOpen) +
    Number(isFindOpen);

  useEffect(() => {
    const prev = overlayOpenCountPrev.current;
    if (prev === 0 && overlayOpenCount > 0) {
      const a = document.activeElement;
      overlayReturnFocusRef.current =
        a instanceof HTMLElement ? a : null;
    }
    if (prev > 0 && overlayOpenCount === 0) {
      const t = overlayReturnFocusRef.current;
      overlayReturnFocusRef.current = null;
      queueMicrotask(() => {
        if (t?.isConnected) t.focus();
      });
    }
    overlayOpenCountPrev.current = overlayOpenCount;
  }, [overlayOpenCount]);

  // Scroll the main page when the tools panel is at its boundary and the user
  // has been idle inside the panel for 2 seconds — prevents accidental overscroll
  // while still allowing intentional page scrolling after a deliberate pause.
  useEffect(() => {
    const FALLBACK_DELAY_MS = 2000;
    const panel = toolsPanelRef.current;
    if (!panel) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      const { scrollTop, scrollHeight, clientHeight } = panel;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const atTop = scrollTop <= 0;
      const panelCanScroll = e.deltaY > 0 ? !atBottom : !atTop;

      if (panelCanScroll) {
        lastPanelScrollRef.current = Date.now();
      } else if (Date.now() - lastPanelScrollRef.current >= FALLBACK_DELAY_MS) {
        e.preventDefault();
        window.scrollBy({ top: e.deltaY });
      }
    };

    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-writing-focus-v2", isFocusMode);
    return () =>
      document.documentElement.removeAttribute("data-writing-focus-v2");
  }, [isFocusMode]);

  // Mobile swipe: horizontal swipe on workshop grid toggles tools panel
  useEffect(() => {
    const el = workshopGridRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = (e.changedTouches[0]?.clientX ?? 0) - startX;
      const dy = (e.changedTouches[0]?.clientY ?? 0) - startY;
      if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      setMobileToolsExpanded(dx > 0);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useLayoutEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    void saveAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SHOW_LINE_SYLLABLES,
        showLineSyllables ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [showLineSyllables]);

  useEffect(() => {
    const lockScroll =
      isLibraryOpen ||
      isAppearanceOpen ||
      isBackgroundOpen ||
      isExportOpen ||
      isCmdkOpen;
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLibraryOpen, isAppearanceOpen, isBackgroundOpen, isExportOpen, isCmdkOpen]);

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
      setIsAppearanceOpen(false);
      setIsBackgroundOpen(false);
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

  const checklistOpenCount = useMemo(
    () => m.publication.items.filter((i) => !i.done).length,
    [m.publication.items],
  );

  const issuesQueueCount = useMemo(() => {
    const spell = m.wordlist ? m.spellHits.length : 0;
    return (
      checklistOpenCount +
      m.goalEvaluation.warnings.length +
      spell
    );
  }, [
    checklistOpenCount,
    m.goalEvaluation.warnings.length,
    m.spellHits.length,
    m.wordlist,
  ]);

  const libraryListRows = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    const labelFor = (p: PoemRecord) =>
      m.draftMeta[p.id]?.label?.trim() || p.title.trim() || "Untitled";
    type Row = {
      id: string;
      label: string;
      poem: PoemRecord;
      meta: DraftMeta;
    };
    const rows: Row[] = m.library.poems.map((poem) => ({
      id: poem.id,
      label: labelFor(poem),
      poem,
      meta: m.draftMeta[poem.id] ?? {},
    }));
    const filtered = rows.filter((r) => {
      if (
        !libraryShowArchived &&
        r.meta.archived &&
        r.id !== m.activePoemId
      ) {
        return false;
      }
      if (!q) return true;
      const tags = (r.meta.tags ?? []).join(" ").toLowerCase();
      const hay = `${r.label} ${r.poem.title} ${tags}`.toLowerCase();
      return hay.includes(q);
    });
    const sorted = filtered.slice();
    sorted.sort((a, b) => {
      const pa = a.meta.pinned ? 1 : 0;
      const pb = b.meta.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      if (librarySort === "title") {
        return a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
        });
      }
      if (librarySort === "updated") {
        return (
          new Date(b.poem.updatedAt).getTime() -
          new Date(a.poem.updatedAt).getTime()
        );
      }
      const oa = a.meta.lastOpenedAt
        ? new Date(a.meta.lastOpenedAt).getTime()
        : 0;
      const ob = b.meta.lastOpenedAt
        ? new Date(b.meta.lastOpenedAt).getTime()
        : 0;
      if (oa !== ob) return ob - oa;
      return (
        new Date(b.poem.updatedAt).getTime() -
        new Date(a.poem.updatedAt).getTime()
      );
    });
    return sorted;
  }, [
    m.library.poems,
    m.draftMeta,
    m.activePoemId,
    libraryQuery,
    libraryShowArchived,
    librarySort,
  ]);

  const libraryListParentRef = useRef<HTMLDivElement | null>(null);
  const libraryVirtualizer = useVirtualizer({
    count: libraryListRows.length,
    getScrollElement: () => libraryListParentRef.current,
    estimateSize: () => 150,
    overscan: 3,
  });

  const cmdkActions = useMemo<CommandPaletteAction[]>(() => {
    return [
      {
        id: "library",
        title: "Open Library",
        keywords: "draft poem library",
        run: () => setIsLibraryOpen(true),
      },
      {
        id: "appearance",
        title: "Fonts",
        keywords: "font typography typeface poem ui interface",
        run: () => setIsAppearanceOpen(true),
      },
      {
        id: "backdrop",
        title: "Page backdrop",
        keywords: "background scene theme paper night forest dawn slate wallpaper",
        run: () => setIsBackgroundOpen(true),
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
        run: () => { m.setToolTab("snapshots"); m.saveSnapshot(); },
      },
      {
        id: "revision-pass",
        title: "Revision pass (open checklist)",
        keywords: "revision pass polish review spelling repeats",
        hint: "Shortcuts to spelling, rhyme & repeats, lines, meter",
        run: () => m.setToolTab("checklist"),
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
      {
        id: "templates",
        title: "Form templates",
        keywords: "template haiku sonnet villanelle limerick form",
        run: () => setIsTemplatesOpen(true),
      },
      {
        id: "reading-mode",
        title: "Reading view",
        keywords: "reading view clean fullscreen poem display",
        run: () => setIsReadingMode(true),
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
        <div className="topbar-primary topbar-primary-tiered">
          <div className="topbar-cluster topbar-cluster-brand">
            <div className="brand brand-tiered">
              <h1 className="brand-mark">
                <svg
                  className="brand-logo-icon"
                  viewBox="0 0 18 24"
                  aria-hidden
                  focusable="false"
                >
                  <path
                    d="M14 2C17 4 18 9 13 15L10 20L9 23L8 20C6 15 7 9 14 2Z"
                    fill="#7a9b7c"
                  />
                  <path
                    d="M14 2L9 20"
                    stroke="rgba(10,15,13,0.25)"
                    strokeWidth="0.65"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M8 20L9 23"
                    stroke="#c5d4c8"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                Easy Poems
              </h1>
              <div className="topbar-draft-inline">
                <label className="draft-library-label" htmlFor="draft-poem-select">
                  Draft
                </label>
                <select
                  id="draft-poem-select"
                  className="draft-library-select"
                  value={m.activePoemId}
                  onChange={(e) => m.selectPoem(e.target.value)}
                  aria-label="Active draft"
                >
                  {m.poemOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                      {o.archived ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="small-btn topbar-library-btn"
                  onClick={() => setIsLibraryOpen(true)}
                  aria-label="Open draft library"
                  title="Library: manage all your drafts"
                >
                  Library
                </button>
              </div>
            </div>
            <p className="brand-sub">
              Local poem desk: write on the left, line tools on the right. Nothing
              leaves your browser until you export or copy.
            </p>
          </div>

          <div
            className="topbar-cluster topbar-cluster-context"
            role="status"
            aria-live="polite"
            aria-label="Draft length"
          >
            {isFocusMode ? (
              <div className="topbar-context-stats topbar-focus-stats">
                <span className="topbar-focus-stat">
                  {m.quickDocStats.totalWords} words
                </span>
                <span className="topbar-focus-sep" aria-hidden>
                  ·
                </span>
                <span
                  className="topbar-focus-stat"
                  title={
                    m.quickDocStats.totalLines !== m.quickDocStats.nonEmptyLines
                      ? `${m.quickDocStats.totalLines} lines in editor including blank lines`
                      : undefined
                  }
                >
                  {m.quickDocStats.nonEmptyLines} lines
                </span>
              </div>
            ) : (
              <div className="topbar-context-stats">
                <span
                  className="topbar-context-stat"
                  title="Word count in poem body"
                >
                  {m.quickDocStats.totalWords} words
                </span>
                <span className="topbar-context-sep" aria-hidden>
                  ·
                </span>
                <span
                  className="topbar-context-stat"
                  title={
                    m.quickDocStats.totalLines !== m.quickDocStats.nonEmptyLines
                      ? `${m.quickDocStats.nonEmptyLines} lines with text; ${m.quickDocStats.totalLines} total in editor (includes blanks)`
                      : "Lines containing at least one character"
                  }
                >
                  {m.quickDocStats.nonEmptyLines} lines
                </span>
                {m.quickDocStats.totalLines !== m.quickDocStats.nonEmptyLines ? (
                  <span className="topbar-context-hint">
                    {" "}
                    ({m.quickDocStats.totalLines} incl. blanks)
                  </span>
                ) : null}
              </div>
            )}
          </div>

          <div className="topbar-cluster topbar-cluster-status" aria-label="Appearance and save">
            {!isFocusMode ? (
              <span className="topbar-look-cluster topbar-look-cluster-ghost">
                <button
                  type="button"
                  className={`topbar-ghost-btn ${isAppearanceOpen ? "is-selected" : ""}`}
                  onClick={() => setIsAppearanceOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isAppearanceOpen}
                  aria-label="Fonts and typography"
                  title="Fonts: poem & interface typefaces"
                >
                  <svg
                    className="topbar-ghost-icon"
                    viewBox="0 0 24 24"
                    aria-hidden
                    focusable="false"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 20h4l2.5-10L13 20h4M7.5 14h5"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.5 9.5h5M18 7v5"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`topbar-ghost-btn topbar-ghost-btn-backdrop ${isBackgroundOpen ? "is-selected" : ""}`}
                  onClick={() => setIsBackgroundOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isBackgroundOpen}
                  aria-label="Page backdrop"
                  title="Backdrop: scene behind the page (decorative)"
                >
                  <svg
                    className="topbar-ghost-icon"
                    viewBox="0 0 24 24"
                    aria-hidden
                    focusable="false"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3c4.5 4 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 2.5-8 7-12Z"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.5 14c1.2-2.2 3.4-3.5 5-4.8M10 17.5h5"
                    />
                  </svg>
                </button>
              </span>
            ) : null}
            <span className="topbar-saved topbar-saved-quiet" aria-live="polite">
              <span className={`save-dot ${m.savedFlash ? "is-on" : ""}`} aria-hidden />
              <span className="topbar-saved-label">Saved</span>
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
        </div>

        {!isFocusMode ? (
          <nav className="topbar-quick topbar-quick-slim" aria-label="Editing actions">
            <button
              type="button"
              className="topbar-quick-btn topbar-quick-cmd"
              onClick={() => setIsCmdkOpen(true)}
              aria-label="Open command palette"
              title="Ctrl or ⌘ K (export, focus mode, and more)"
            >
              <span className="topbar-quick-label">Commands</span>
              <span className="topbar-quick-keys">
                <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>
                <span className="topbar-quick-plus">+</span>
                <kbd className="kbd-hint">K</kbd>
              </span>
            </button>
            <button
              type="button"
              className="topbar-quick-btn topbar-quick-cmd"
              onClick={() => {
                setFindMode("find");
                setIsFindOpen(true);
              }}
              aria-label="Find in poem"
              title="Ctrl or ⌘ F"
            >
              <span className="topbar-quick-label">Find</span>
              <span className="topbar-quick-keys">
                <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>
                <span className="topbar-quick-plus">+</span>
                <kbd className="kbd-hint">F</kbd>
              </span>
            </button>
          </nav>
        ) : null}
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
          {m.storageNearlyFull ? (
            <button
              type="button"
              className="small-btn small-btn-primary persistence-banner-export"
              onClick={() => {
                void m.exportWorkshopBackup();
                m.dismissPersistenceError();
              }}
            >
              Export now
            </button>
          ) : null}
          <button
            type="button"
            className="small-btn persistence-banner-dismiss"
            onClick={m.dismissPersistenceError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {m.wordlistErr ? (
        <div
          className="spell-warn-banner"
          role="status"
          aria-live="polite"
        >
          <p className="spell-warn-banner-text">
            Spell check unavailable: {m.wordlistErr}
          </p>
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

      {m.showExportReminder ? (
        <div
          className="import-notice-banner"
          role="status"
          aria-live="polite"
        >
          <p className="import-notice-text">
            It&rsquo;s been a while since your last backup. Export your workshop
            to keep a local copy of all your drafts.
          </p>
          <button
            type="button"
            className="small-btn"
            onClick={() => {
              void m.exportWorkshopBackup();
            }}
          >
            Export now
          </button>
          <button
            type="button"
            className="small-btn import-notice-dismiss"
            onClick={m.dismissExportReminder}
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

            <details className="drawer-accordion" open>
              <summary className="drawer-accordion-summary">Drafts</summary>
              <div className="drawer-accordion-body">
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
                <div className="library-filters" role="search">
                  <label className="library-filter-field">
                    <span className="library-filter-label">Search</span>
                    <input
                      type="search"
                      value={libraryQuery}
                      onChange={(e) => setLibraryQuery(e.target.value)}
                      placeholder="Title, label, tags"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="Filter drafts in library"
                    />
                  </label>
                  <label className="library-filter-field">
                    <span className="library-filter-label">Sort</span>
                    <select
                      value={librarySort}
                      onChange={(e) =>
                        setLibrarySort(e.target.value as typeof librarySort)
                      }
                      aria-label="Sort drafts"
                    >
                      <option value="recent">Recent (opened)</option>
                      <option value="updated">Recently edited</option>
                      <option value="title">Title A–Z</option>
                    </select>
                  </label>
                  <label className="library-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={libraryShowArchived}
                      onChange={(e) =>
                        setLibraryShowArchived(e.target.checked)
                      }
                    />
                    Show archived
                  </label>
                </div>
                <p className="muted small drawer-filter-hint">
                  Search matches title, display label, and tags.
                  Pinned drafts always appear first.
                </p>
                {libraryListRows.length === 0 ? (
                  <p className="drawer-note library-empty-msg" role="status">
                    No drafts match this filter.
                  </p>
                ) : (
                <div
                  ref={libraryListParentRef}
                  style={{ overflowY: "auto", maxHeight: "28rem" }}
                >
                  <div
                    role="list"
                    aria-label="Drafts in library"
                    style={{
                      height: `${libraryVirtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {libraryVirtualizer.getVirtualItems().map((vItem) => {
                      const row = libraryListRows[vItem.index]!;
                      const { id, label, meta } = row;
                      const tags = (meta.tags ?? []).join(", ");
                      const isActive = id === m.activePoemId;
                      const isArchived = Boolean(meta.archived);
                      return (
                        <div
                          key={id}
                          role="listitem"
                          data-index={vItem.index}
                          ref={libraryVirtualizer.measureElement}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${vItem.start}px)`,
                            paddingBottom: "0.55rem",
                            boxSizing: "border-box",
                          }}
                        >
                          <div
                            className={`draft-item ${isActive ? "is-active" : ""} ${isArchived ? "is-archived" : ""}`}
                          >
                            <div className="draft-item-row">
                              <button
                                type="button"
                                className={`pin-btn ${meta.pinned ? "is-on" : ""}`}
                                onClick={() => m.togglePinned(id)}
                                aria-pressed={Boolean(meta.pinned)}
                                title={meta.pinned ? "Unpin" : "Pin"}
                              >
                                {meta.pinned ? "★" : "☆"}
                              </button>
                              <button
                                type="button"
                                className="draft-open-btn"
                                onClick={() => {
                                  m.selectPoem(id);
                                  setIsLibraryOpen(false);
                                }}
                                aria-current={isActive ? "true" : undefined}
                                title="Open this draft"
                              >
                                {label}
                                {isArchived ? " (archived)" : ""}
                              </button>
                              <button
                                type="button"
                                className="small-btn draft-row-dup"
                                onClick={() => {
                                  m.duplicatePoemById(id);
                                  setIsLibraryOpen(false);
                                }}
                                title="Duplicate this draft"
                              >
                                Dup
                              </button>
                              {isArchived ? (
                                <button
                                  type="button"
                                  className="small-btn"
                                  onClick={() => m.setDraftArchived(id, false)}
                                  title="Return to main list"
                                >
                                  Unarchive
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="small-btn"
                                  disabled={isActive}
                                  title={
                                    isActive
                                      ? "Switch to another draft first"
                                      : "Hide from list (data kept)"
                                  }
                                  onClick={() => m.setDraftArchived(id, true)}
                                >
                                  Archive
                                </button>
                              )}
                            </div>
                            <div className="draft-item-edit">
                              <label className="draft-edit-field">
                                Label
                                <input
                                  type="text"
                                  value={meta.label ?? ""}
                                  onChange={(e) =>
                                    m.setDraftLabel(id, e.target.value)
                                  }
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
                                      id,
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}
                <p className="drawer-note">
                  Pinned drafts stay at the top; drafts also sort by last opened.
                </p>
              </div>
            </details>

            <details className="drawer-accordion">
              <summary className="drawer-accordion-summary">Fonts</summary>
              <div className="drawer-accordion-body">
                <p className="drawer-note">
                  Poem and UI fonts apply in this browser only. The top bar has
                  dedicated <strong>Fonts</strong> and <strong>Backdrop</strong>{" "}
                  buttons.
                </p>
                <AppearanceFormFields
                  appearance={appearance}
                  onChange={setAppearance}
                />
              </div>
            </details>
            <details className="drawer-accordion">
              <summary className="drawer-accordion-summary">Page backdrop</summary>
              <div className="drawer-accordion-body">
                <p className="drawer-note">
                  Each scene layers symbols and texture behind the editor—purely
                  visual.
                </p>
                <BackgroundPicker
                  appearance={appearance}
                  background={appearance.background}
                  onChange={setAppearance}
                />
              </div>
            </details>

            <details className="drawer-accordion">
              <summary className="drawer-accordion-summary">Backup</summary>
              <div className="drawer-accordion-body">
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
            </details>
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
              <button
                type="button"
                className="small-btn"
                onClick={() => window.print()}
                title="Print or save as PDF via your browser’s print dialog"
              >
                Print / PDF
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
            <div className="export-backup-row">
              <h3 className="export-backup-title">Workshop backup</h3>
              <p className="modal-note">
                Export or import all drafts + snapshots as a single JSON file—useful for switching devices.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => void m.exportWorkshopBackup()}
                  title="Download all drafts and snapshots as a JSON backup"
                >
                  Export backup (.json)
                </button>
                <button
                  type="button"
                  className="small-btn"
                  onClick={m.triggerImportBackup}
                  title="Import a previously exported backup JSON file"
                >
                  Import backup
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isAppearanceOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAppearanceOpen(false);
          }}
        >
          <section
            className="modal appearance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appearance-modal-title"
          >
            <div className="modal-head">
              <h2 id="appearance-modal-title" className="modal-title">
                Fonts
              </h2>
              <button
                type="button"
                className="small-btn"
                onClick={() => setIsAppearanceOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="modal-note appearance-modal-lead">
              Poem and interface fonts are saved in this browser only. Backdrop lives
              under <strong>Backdrop</strong> in the header.
            </p>
            <AppearanceFormFields
              appearance={appearance}
              onChange={setAppearance}
            />
          </section>
        </div>
      ) : null}

      {isBackgroundOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsBackgroundOpen(false);
          }}
        >
          <section
            className="modal background-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="background-modal-title"
          >
            <div className="modal-head">
              <h2 id="background-modal-title" className="modal-title">
                Page backdrop
              </h2>
              <button
                type="button"
                className="small-btn"
                onClick={() => setIsBackgroundOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="modal-note background-modal-lead">
              Symbol layers and tints sit behind your draft—pick a mood without
              touching typography.
            </p>
            <BackgroundPicker
              appearance={appearance}
              background={appearance.background}
              onChange={setAppearance}
            />
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

      <div className="workshop-grid" ref={workshopGridRef}>
        <nav className={`workshop-rail ${isFocusMode ? "is-hidden" : ""}`} aria-label="Workshop shortcuts">
          <button
            type="button"
            className="rail-btn rail-btn-library"
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
            className="rail-btn rail-btn-fonts"
            onClick={() => setIsAppearanceOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isAppearanceOpen}
            title="Poem font and UI font"
          >
            <RailIcon title="Fonts">
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 20h4l2.5-10L13 20h4M7.5 14h5"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.5 9.5h5M18 7v5"
                />
              </svg>
            </RailIcon>
            <span className="rail-label">Fonts</span>
          </button>

          <button
            type="button"
            className="rail-btn rail-btn-scene"
            onClick={() => setIsBackgroundOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isBackgroundOpen}
            title="Page backdrop — symbols and mood"
          >
            <RailIcon title="Backdrop">
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c4.5 4 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 2.5-8 7-12Z"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.5 14c1.2-2.2 3.4-3.5 5-4.8"
                />
              </svg>
            </RailIcon>
            <span className="rail-label">Backdrop</span>
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
                  <FormatToolbar
                    editorViewRef={m.editorViewRef}
                    poemSize={appearance.poemSize}
                    onSizeChange={(size) =>
                      setAppearance((prev) => ({ ...prev, poemSize: size }))
                    }
                    getBody={() => m.body}
                    onReadingMode={() => setIsReadingMode(true)}
                    showLineSyllables={showLineSyllables}
                    onShowLineSyllablesChange={setShowLineSyllables}
                  />
                </div>
                <div className="poem-editor-shell">
                  <PoemBodyEditor
                    id="poem-body"
                    aria-describedby="poem-body-hint"
                    value={m.body}
                    bodySyncNonce={m.bodySyncNonce}
                    onLiveBody={m.onEditorBody}
                    editorViewRef={m.editorViewRef}
                    wordlist={m.wordlist}
                    spellMode={m.spellMode}
                    spellBump={m.spellBump}
                    jumpLine={m.jumpLine}
                    jumpBump={m.jumpBump}
                    issueHighlight={issueHighlight}
                    showLineSyllables={showLineSyllables}
                  />
                  <WordLookupPopup editorViewRef={m.editorViewRef} />
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
          ref={toolsPanelRef}
          className={`tools-panel ${isFocusMode ? "is-collapsed" : ""} ${!mobileToolsExpanded ? "is-mobile-collapsed" : ""}`}
          aria-label="Tools"
          id="writing-tools"
        >
          <div className="tools-sticky-head">
            <div className="tools-head-row tools-head-row-simple">
              <div>
                <h2 className="tools-heading">Tools</h2>
                <p className="tools-panel-hint muted">Live analysis — updates as you write</p>
              </div>
              <button
                type="button"
                className="mobile-tools-panel-toggle"
                onClick={() => setMobileToolsExpanded((v) => !v)}
                aria-expanded={mobileToolsExpanded}
                aria-controls="writing-tools"
              >
                {mobileToolsExpanded ? "Hide tools" : "Show tools"}
              </button>
            </div>
            <div
              className="tool-bucket-row"
              role="tablist"
              aria-label="Tool groups"
            >
              {TOOL_BUCKET_ORDER.map((b) => {
                const active = toolTabBucket(m.toolTab) === b;
                return (
                  <button
                    key={b}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    className={`tool-bucket-tab ${active ? "active" : ""}`}
                    onClick={() => m.setToolTab(defaultTabForBucket(b))}
                  >
                    {TOOL_BUCKET_LABEL[b]}
                  </button>
                );
              })}
            </div>
            {toolTabBucket(m.toolTab) === "overview" ? (
              <ToolsOverviewStrip
                issuesQueueCount={issuesQueueCount}
                quickDocStats={m.quickDocStats}
                spellHitCount={m.spellHits.length}
                wordlistReady={Boolean(m.wordlist)}
                rhymeClusterCount={m.rhymeClusters.length}
                goalEvaluation={m.goalEvaluation}
                repeatCount={m.repeated.length}
                checklistOpenCount={checklistOpenCount}
                meterCoverage={m.meterCoverageSummary}
                stressLexiconReady={m.stressLexiconReady}
                heavyToolsStale={m.heavyToolsStale}
                activeTab={m.toolTab}
                onOpenTab={m.setToolTab}
              />
            ) : null}
            <nav
              className="tool-tabs"
              role="tablist"
              aria-label="Tools in this group"
              onKeyDown={onToolTabKeyDown}
            >
              {TOOL_TABS.filter((t) => bucketTabs.includes(t.id)).map(
                ({ id, label, Icon }) => (
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
                ),
              )}
            </nav>
            <details className="workshop-head-shortcuts">
              <summary className="workshop-head-shortcuts-summary">
                Keyboard shortcuts
              </summary>
              <div className="workshop-head-shortcuts-body">
                <p className="workshop-head-shortcuts-lead muted small">
                  These work globally unless your cursor is in the poem or another
                  text field.
                </p>
                <ul className="workshop-head-shortcuts-list">
                  <li>
                    <kbd className="kbd-hint">Ctrl</kbd> +{" "}
                    <kbd className="kbd-hint">Alt</kbd> +{" "}
                    <kbd className="kbd-hint">[</kbd> /{" "}
                    <kbd className="kbd-hint">]</kbd> — cycle tools in the current
                    group (Overview or Sound).
                  </li>
                  <li>
                    <kbd className="kbd-hint">⌘</kbd> /{" "}
                    <kbd className="kbd-hint">Ctrl</kbd> +{" "}
                    <kbd className="kbd-hint">K</kbd> — command palette.
                  </li>
                  <li>
                    <kbd className="kbd-hint">⌘</kbd> /{" "}
                    <kbd className="kbd-hint">Ctrl</kbd> +{" "}
                    <kbd className="kbd-hint">F</kbd> — find in poem.
                  </li>
                  <li>
                    <kbd className="kbd-hint">⌘</kbd> /{" "}
                    <kbd className="kbd-hint">Ctrl</kbd> +{" "}
                    <kbd className="kbd-hint">H</kbd> — replace in poem.
                  </li>
                  <li>
                    When spelling flags exist:{" "}
                    <kbd className="kbd-hint">Ctrl</kbd> +{" "}
                    <kbd className="kbd-hint">Alt</kbd> +{" "}
                    <kbd className="kbd-hint">,</kbd> /{" "}
                    <kbd className="kbd-hint">.</kbd> — previous / next flag.
                  </li>
                </ul>
                <p className="workshop-head-shortcuts-note muted small">
                  Syllable, meter, and rhyme hints are rough English heuristics—signals,
                  not a grade.
                </p>
              </div>
            </details>
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
            assonanceClusters={m.assonanceClusters}
            consonanceClusters={m.consonanceClusters}
            repeated={m.repeated}
            spellHits={m.spellHits}
            wordlist={m.wordlist}
            wordlistErr={m.wordlistErr}
            spellMode={m.spellMode}
            onSpellModeChange={m.setSpellMode}
            goToLine={m.goToLine}
            goToSpellHitAt={m.goToSpellHitAt}
            cycleSpellHit={m.cycleSpellHit}
            spellNavIndex={m.spellNavIndex}
            applySpellSuggestion={m.applySpellSuggestion}
            spellBump={m.spellBump}
            refreshSpell={m.refreshSpell}
            onSpellPersistenceError={m.onSpellPersistenceError}
            updateGoal={m.updateGoal}
            revisions={m.revisions}
            snapshotLabel={m.snapshotLabel}
            onSnapshotLabelChange={m.setSnapshotLabel}
            onSaveSnapshot={m.saveSnapshot}
            snapshotFlash={m.snapshotFlash}
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
            stressLexiconReady={m.stressLexiconReady}
            stressLexiconErr={m.stressLexiconErr}
            heavyToolsStale={m.heavyToolsStale}
            meterCoverageSummary={m.meterCoverageSummary}
            rhymeScheme={m.rhymeScheme}
            clicheHits={m.clicheHits}
          />
        </aside>
      </div>

      <nav
        className={`mobile-actionbar mobile-actionbar-5 ${isFocusMode ? "is-hidden" : ""}`}
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
          className="mobile-action-btn mobile-action-btn-fonts"
          onClick={() => setIsAppearanceOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isAppearanceOpen}
        >
          Fonts
        </button>
        <button
          type="button"
          className="mobile-action-btn mobile-action-btn-scene"
          onClick={() => setIsBackgroundOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isBackgroundOpen}
        >
          Backdrop
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

      <AiAnalysis
        title={m.title}
        lines={m.lines}
        onJumpToLine={m.goToLine}
        onHighlightLines={(start, end) => setIssueHighlight([start, end])}
        onClearHighlight={() => setIssueHighlight(null)}
      />

      {isTemplatesOpen && (
        <TemplatesModal
          onClose={() => setIsTemplatesOpen(false)}
          onInsert={(body, form) => {
            m.applyTemplate(body, form);
            setIsTemplatesOpen(false);
          }}
        />
      )}

      {isReadingMode && (
        <ReadingModeModal
          title={m.title}
          formNote={m.formNote}
          body={m.body}
          onClose={() => setIsReadingMode(false)}
        />
      )}

      <FeedbackWidget />

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
        <p>
          You are responsible for what you write and share; use the workshop only
          for content you may lawfully create and publish.
        </p>
      </footer>
    </div>
  );
}
