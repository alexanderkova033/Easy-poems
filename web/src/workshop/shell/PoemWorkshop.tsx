import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  applyAppearance,
  loadAppearance,
  saveAppearance,
  type AppearanceSettings,
} from "@/workshop/appearance/appearance";
import { AppearanceFormFields } from "@/workshop/appearance/AppearanceFormFields";
import { BackdropFormFields } from "@/workshop/appearance/BackdropFormFields";
import { BackgroundPicker } from "@/workshop/appearance/BackgroundPicker";
import { FirstVisitHint } from "./FirstVisitHint";
import { FeedbackWidget } from "./FeedbackWidget";
import { PoemBodyEditor } from "@/workshop/editor/PoemBodyEditor";
import { TOOL_TABS } from "@/workshop/analysis/ToolTabBar";
import { ToolsOverviewStrip } from "@/workshop/analysis/ToolsOverviewStrip";
import { useToolTabListKeyboard } from "@/workshop/analysis/useToolTabListKeyboard";
import { useWorkshopToolHotkeys } from "@/workshop/analysis/useWorkshopToolHotkeys";
import { WorkshopToolPanels } from "@/workshop/analysis/WorkshopToolPanels";
import type { DraftMeta } from "@/workshop/library/library-meta";
import type { PoemRecord } from "@/workshop/library/local-draft-library";
import { usePoemWorkshopModel } from "./usePoemWorkshopModel";
import { AiAnalysis } from "@/workshop/analysis/AiAnalysis";
import { detectPoemForm, type LocalAnalysisContext } from "@/workshop/analysis/ai-analyze";
import { FormatToolbar } from "@/workshop/editor/FormatToolbar";
import { SelectionSuggestPopover } from "@/workshop/editor/SelectionSuggestPopover";
import { ShareModal, ViewSharedPoem } from "@/workshop/sharing/ShareModal";
import { checkShareHash } from "@/workshop/sharing/sharing";
import { WordLookupPopup } from "@/workshop/vocabulary/WordLookupPopup";
import { TemplatesModal } from "./TemplatesModal";
import { ReadingModeModal } from "@/workshop/reading/ReadingModeModal";
import { CommandPalette, toolTabActions, type CommandPaletteAction } from "@/workshop/palette/CommandPalette";
import { FindReplaceBar } from "@/workshop/editor/FindReplaceBar";
import {
  TOOL_BUCKET_LABEL,
  TOOL_BUCKET_ORDER,
  defaultTabForBucket,
  formatRelativeSnapshotWhen,
  formatSnapshotWhen,
  tabsForBucket,
  toolTabBucket,
} from "./workshop-helpers";
import { STORAGE_KEY_SHOW_LINE_SYLLABLES, STORAGE_KEY_SHOW_RHYME_SCHEME, STORAGE_KEY_RHYME_SCHEME_BREADTH, STORAGE_KEY_WORD_LOOKUP_ENABLED } from "@/shared/storage-keys";
import type { RhymeBreadth } from "@/workshop/analysis/rhyme-scheme";
import { KeyboardShortcutsContent } from "./KeyboardShortcutsContent";
import { SpotlightTour } from "@/workshop/tour/SpotlightTour";
import {
  useHoverHintBinder,
  useHoverHintsSettings,
} from "@/workshop/hints/HoverHintsContext";
import "./PoemWorkshop.css";

function RailIcon({ children }: { children: ReactNode }) {
  return (
    <span className="workshop-rail-icon" aria-hidden>
      {children}
    </span>
  );
}

export function PoemWorkshop() {
  const [rhymeBreadth, setRhymeBreadth] = useState<RhymeBreadth>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RHYME_SCHEME_BREADTH);
      if (raw === "strict" || raw === "near" || raw === "broad") return raw;
    } catch { /* ignore */ }
    return "near";
  });

  const m = usePoemWorkshopModel(rhymeBreadth);
  const bucketTabs = tabsForBucket(toolTabBucket(m.toolTab));
  const onToolTabKeyDown = useToolTabListKeyboard(
    m.toolTab,
    m.setToolTab,
    bucketTabs,
  );
  useWorkshopToolHotkeys(m.toolTab, m.setToolTab);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  // Aliases for code that previously used these
  const setIsAppearanceOpen = (v: boolean) => setIsStyleOpen(v);
  const isAppearanceOpen = isStyleOpen;
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [librarySort, setLibrarySort] = useState<
    "recent" | "title" | "updated"
  >("recent");
  const [libraryShowArchived, setLibraryShowArchived] = useState(false);
  const librarySearchRef = useRef<HTMLInputElement | null>(null);
  const [libraryActiveIdx, setLibraryActiveIdx] = useState(0);
  const [mobileToolsExpanded, setMobileToolsExpanded] = useState(false);
  const [issueHighlight, setIssueHighlight] = useState<[number, number, string?] | null>(null);
  const [persistentIssueHighlights, setPersistentIssueHighlights] = useState<Array<[number, number, string?]>>([]);
  const [selectionText, setSelectionText] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sharedPoemView, setSharedPoemView] = useState(() => checkShareHash());

  const localAnalysis = useMemo<LocalAnalysisContext>(() => {
    const syllablesPerLine = m.lines.map((_, i) => m.docStats.lines[i]?.syllables ?? 0);
    return {
      cliches: m.clicheHits,
      rhymeScheme: m.rhymeScheme,
      syllablesPerLine,
      repeatedWords: m.repeated,
      form: detectPoemForm(m.lines, syllablesPerLine),
    };
  }, [m.clicheHits, m.rhymeScheme, m.docStats.lines, m.repeated, m.lines]);
  const prevActivePoemIdRef = useRef(m.activePoemId);
  useEffect(() => {
    if (m.activePoemId !== prevActivePoemIdRef.current) {
      prevActivePoemIdRef.current = m.activePoemId;
      setIssueHighlight(null);
      setPersistentIssueHighlights([]);
    }
  }, [m.activePoemId]);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [showDeleteCurrentConfirm, setShowDeleteCurrentConfirm] = useState(false);
  const [pendingDeleteSnapId, setPendingDeleteSnapId] = useState<string | null>(null);
  const [exportFlash, setExportFlash] = useState<string | null>(null);
  const exportFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [showRhymeScheme, setShowRhymeScheme] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SHOW_RHYME_SCHEME);
      if (raw === "0" || raw === "false") return false;
    } catch {
      /* ignore */
    }
    return true;
  });
  const [wordLookupEnabled, setWordLookupEnabled] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY_WORD_LOOKUP_ENABLED);
      if (v === "1" || v === "true") return true;
      if (v === "0" || v === "false") return false;
    } catch { /* ignore */ }
    return false; // off by default — enable via Format toolbar or Commands
  });
  const workshopGridRef = useRef<HTMLDivElement | null>(null);
  const [appearance, setAppearance] = useState<AppearanceSettings>(() =>
    loadAppearance(),
  );
  const hint = useHoverHintBinder();
  const { enabled: hoverHintsEnabled, setEnabled: setHoverHintsEnabled } =
    useHoverHintsSettings();
  const overlayOpenCountPrev = useRef(0);
  const overlayReturnFocusRef = useRef<HTMLElement | null>(null);
  const toolsPanelRef = useRef<HTMLElement | null>(null);
  const lastPanelScrollRef = useRef<number>(0);

  const overlayOpenCount =
    Number(isLibraryOpen) +
    Number(isExportOpen) +
    Number(isStyleOpen) +
    Number(isBackgroundOpen) +
    Number(isCmdkOpen) +
    Number(isFindOpen) +
    Number(isShortcutsOpen) +
    Number(isGuideOpen);

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
    const FALLBACK_DELAY_MS = 500;
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

  // Reset tools panel scroll to top when switching tabs so you always start at the top.
  useEffect(() => {
    toolsPanelRef.current?.scrollTo({ top: 0 });
  }, [m.toolTab]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-writing-focus-v2", isFocusMode);
    return () => {
      document.documentElement.removeAttribute("data-writing-focus-v2");
    };
  }, [isFocusMode]);

  useEffect(() => {
    const simplify = isFocusMode || appearance.backdropPower !== "off";
    document.documentElement.toggleAttribute("data-backdrop-simplify", simplify);
    return () => document.documentElement.removeAttribute("data-backdrop-simplify");
  }, [appearance.backdropPower, isFocusMode]);

  // Mobile swipe: horizontal swipe on workshop grid slides between editor and tools.
  // Swipe LEFT  → show tools (editor slides out to the left)
  // Swipe RIGHT → show editor (tools slides out to the right)
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
      if (Math.abs(dx) < 36 || Math.abs(dy) > Math.abs(dx) * 0.65) return;
      // dx < 0 = left swipe → show tools; dx > 0 = right swipe → show editor
      setMobileToolsExpanded(dx < 0);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const doExportFlash = (msg: string) => {
    setExportFlash(msg);
    if (exportFlashTimerRef.current) clearTimeout(exportFlashTimerRef.current);
    exportFlashTimerRef.current = setTimeout(() => setExportFlash(null), 1800);
  };

  useEffect(() => {
    return () => {
      if (exportFlashTimerRef.current) clearTimeout(exportFlashTimerRef.current);
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
    try { localStorage.setItem(STORAGE_KEY_RHYME_SCHEME_BREADTH, rhymeBreadth); } catch { /* ignore */ }
  }, [rhymeBreadth]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SHOW_RHYME_SCHEME,
        showRhymeScheme ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [showRhymeScheme]);

  useEffect(() => {
    const lockScroll =
      isLibraryOpen ||
      isStyleOpen ||
      isBackgroundOpen ||
      isExportOpen ||
      isCmdkOpen ||
      isShortcutsOpen ||
      isGuideOpen;
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLibraryOpen, isStyleOpen, isBackgroundOpen, isExportOpen, isCmdkOpen, isShortcutsOpen, isGuideOpen]);

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
      if (e.key.toLowerCase() === "r" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        setIsReadingMode((v) => !v);
        return;
      }
      if (e.key !== "Escape") return;
      setIsLibraryOpen(false);
      setIsStyleOpen(false);
      setIsBackgroundOpen(false);
      setIsExportOpen(false);
      setIsCmdkOpen(false);
      setIsFindOpen(false);
      setIsShortcutsOpen(false);
      setIsGuideOpen(false);
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

  useEffect(() => {
    if (!isLibraryOpen) return;
    setLibraryActiveIdx(0);
    queueMicrotask(() => librarySearchRef.current?.focus());
  }, [isLibraryOpen]);

  useEffect(() => {
    if (!isLibraryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      // Don't steal keys while typing in a field.
      if (e.target && (e.target as HTMLElement).closest?.("input,textarea,select,[contenteditable='true']")) {
        return;
      }
      if (libraryListRows.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setLibraryActiveIdx((i) => Math.min(i + 1, libraryListRows.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setLibraryActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        const row = libraryListRows[libraryActiveIdx];
        if (!row) return;
        e.preventDefault();
        m.selectPoem(row.id);
        setIsLibraryOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isLibraryOpen, libraryActiveIdx, libraryListRows, m]);

  useEffect(() => {
    if (!isLibraryOpen) return;
    try {
      libraryVirtualizer.scrollToIndex(libraryActiveIdx, { align: "auto" });
    } catch {
      /* ignore */
    }
  }, [isLibraryOpen, libraryActiveIdx, libraryVirtualizer]);

  const cmdkActions = useMemo<CommandPaletteAction[]>(() => {
    return [
      {
        id: "workshop-guide",
        title: "Guide",
        keywords: "help guide tour new introduction overview walkthrough",
        run: () => setIsGuideOpen(true),
      },
      {
        id: "toggle-hover-hints",
        title: hoverHintsEnabled
          ? "Turn off delayed hover explanations"
          : "Turn on delayed hover explanations",
        keywords:
          "hover tooltip tip button explain description help hints delayed hover",
        run: () => setHoverHintsEnabled((v) => !v),
      },
      {
        id: "toggle-word-lookup",
        title: wordLookupEnabled
          ? "Turn off word lookup popup"
          : "Turn on word lookup popup",
        keywords: "word lookup dictionary synonym antonym popup disable enable",
        run: () => {
          const next = !wordLookupEnabled;
          setWordLookupEnabled(next);
          try { localStorage.setItem(STORAGE_KEY_WORD_LOOKUP_ENABLED, next ? "1" : "0"); } catch { /* ignore */ }
        },
      },
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
        title: "Page background",
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
        hint: "Shortcuts to spelling, rhyme, repeats, lines, meter",
        run: () => m.setToolTab("checklist"),
      },
      {
        id: "keyboard-shortcuts",
        title: "Keyboard shortcuts",
        keywords: "shortcuts keys hotkeys keyboard help",
        run: () => setIsShortcutsOpen(true),
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
  }, [focusPoemTitle, hoverHintsEnabled, isFocusMode, m, setHoverHintsEnabled]);

  const topbarLinesHint =
    m.quickDocStats.totalLines !== m.quickDocStats.nonEmptyLines
      ? `${m.quickDocStats.nonEmptyLines} lines with text; ${m.quickDocStats.totalLines} total in editor (includes blanks)`
      : "Lines containing at least one character";

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
                  viewBox="0 0 24 24"
                  aria-hidden
                  focusable="false"
                >
                  {/* Feather body — vivid accent fill, white stroke for any-bg visibility */}
                  <path
                    d="M19 3C19 3 20 8 16 13L13 18L12 21L11 18C9.5 14.5 10 9 16 4C17 3.3 18.2 3 19 3Z"
                    fill="#68aa6e"
                    stroke="white"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />
                  {/* Quill vein */}
                  <path
                    d="M19 3L12 21"
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="0.55"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Nib highlight */}
                  <path
                    d="M11 18L12 21"
                    stroke="#c5e0c8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Dark outline for light-background visibility */}
                  <path
                    d="M19 3C19 3 20 8 16 13L13 18L12 21L11 18C9.5 14.5 10 9 16 4C17 3.3 18.2 3 19 3Z"
                    fill="none"
                    stroke="rgba(30,60,35,0.22)"
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                </svg>
                easywriting-poem
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
                  className="topbar-draft-icon-btn"
                  onClick={() => m.newPoem()}
                  aria-label="New draft"
                  {...hint("New draft")}
                >
                  +
                </button>
                <button
                  type="button"
                  className="topbar-draft-icon-btn"
                  onClick={() => setIsLibraryOpen(true)}
                  aria-label="Open draft library"
                  {...hint("Library: manage all your drafts — create, switch, or archive.")}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden width="14" height="14">
                    <rect x="2" y="3" width="16" height="2.5" rx="1" fill="currentColor"/>
                    <rect x="2" y="8.75" width="16" height="2.5" rx="1" fill="currentColor"/>
                    <rect x="2" y="14.5" width="10" height="2.5" rx="1" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
            <p className="brand-sub">
              For poets who want real analysis tools — private, local, no account.
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
                  {...hint(
                    m.quickDocStats.totalLines !== m.quickDocStats.nonEmptyLines
                      ? `${m.quickDocStats.totalLines} lines in editor including blank lines`
                      : "",
                  )}
                >
                  {m.quickDocStats.nonEmptyLines} lines
                </span>
              </div>
            ) : (
              <div className="topbar-context-stats">
                <span
                  className="topbar-context-stat"
                  {...hint("Word count in poem body")}
                >
                  {m.quickDocStats.totalWords} words
                </span>
                <span className="topbar-context-sep" aria-hidden>
                  ·
                </span>
                <span
                  className="topbar-context-stat"
                  {...hint(topbarLinesHint)}
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
                  {...hint("Fonts: poem and interface typefaces")}
                >
                  {/* Large A + small a = font picker icon */}
                  <svg
                    className="topbar-ghost-icon"
                    viewBox="0 0 24 24"
                    aria-hidden
                    focusable="false"
                  >
                    <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M4 19l5-13 5 13M6 14h6" />
                    <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M17 19v-5.5a2.5 2.5 0 0 1 5 0V19M15.5 16h4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`topbar-ghost-btn topbar-ghost-btn-backdrop ${isBackgroundOpen ? "is-selected" : ""}`}
                  onClick={() => setIsBackgroundOpen((v) => !v)}
                  aria-haspopup="dialog"
                  aria-expanded={isBackgroundOpen}
                  aria-label="Page background"
                  {...hint("Background: choose a scene behind the page")}
                >
                  {/* Landscape/image icon — clearly "background scene" */}
                  <svg
                    className="topbar-ghost-icon"
                    viewBox="0 0 24 24"
                    aria-hidden
                    focusable="false"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                    <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M3 15l4.5-4.5 3 3 3-3 4.5 4.5" />
                    <circle cx="8" cy="9.5" r="1.25" fill="currentColor" />
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
                {...hint("Exit focus mode — bring back tools and the side rail")}
              >
                Show tools
              </button>
            ) : null}
          </div>
        </div>

        {!isFocusMode ? (
          <nav className="topbar-quick topbar-quick-slim" aria-label="Editing actions" data-tour-id="topbar-actions">
            <button
              type="button"
              className="topbar-quick-btn topbar-quick-cmd"
              onClick={() => setIsCmdkOpen(true)}
              aria-label="Open command palette"
              {...hint("Commands — search export, focus mode, templates, and more (⌘/Ctrl+K)")}
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
              {...hint("Find text in the poem (⌘/Ctrl+F)")}
            >
              <span className="topbar-quick-label">Find</span>
              <span className="topbar-quick-keys">
                <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>
                <span className="topbar-quick-plus">+</span>
                <kbd className="kbd-hint">F</kbd>
              </span>
            </button>
            <button
              type="button"
              className="topbar-quick-btn topbar-quick-shortcuts"
              onClick={() => setIsShortcutsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isShortcutsOpen}
              aria-label="Keyboard shortcuts"
              {...hint("All keyboard shortcuts for the workshop")}
            >
              <span className="topbar-quick-label">Shortcuts</span>
            </button>
            <button
              type="button"
              className="topbar-quick-btn"
              onClick={() => setIsShareOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isShareOpen}
              aria-label="Share poem"
              {...hint("Share — generate a link to this poem (encoded in URL, no server)")}
            >
              <span className="topbar-quick-label">Share</span>
            </button>
          </nav>
        ) : null}
      </header>

      <FirstVisitHint onOpenGuide={() => setIsGuideOpen(true)} />

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
          <button
            type="button"
            className="small-btn spell-warn-retry-btn"
            onClick={m.retryWordlist}
          >
            Retry
          </button>
        </div>
      ) : null}

      {m.importNotice ? (
        <div
          className={`import-notice-banner ${m.importNoticeKind === "error" ? "is-error" : "is-success"}`}
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
          className="overlay overlay-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsLibraryOpen(false);
              setShowDeleteCurrentConfirm(false);
            }
          }}
        >
          <section
            className="drawer library-modal"
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

            <div className="drawer-scroll">
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
                  {showDeleteCurrentConfirm ? (
                    <span className="library-delete-confirm" role="group" aria-label="Confirm delete draft">
                      <span className="library-delete-confirm-text">Delete this draft?</span>
                      <button
                        type="button"
                        className="small-btn danger-btn"
                        onClick={() => {
                          m.deleteCurrentPoem();
                          setShowDeleteCurrentConfirm(false);
                          setIsLibraryOpen(false);
                        }}
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        className="small-btn"
                        onClick={() => setShowDeleteCurrentConfirm(false)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="small-btn danger-btn"
                      onClick={() => setShowDeleteCurrentConfirm(true)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="drawer-note">
                  Drafts and snapshots stay in this browser unless you export them.
                </p>
                <div className="library-filters" role="search">
                  <label className="library-filter-field">
                    <span className="library-filter-label">Search</span>
                    <input
                      ref={librarySearchRef}
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
                <div ref={libraryListParentRef} className="library-list-scroll">
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
                          aria-selected={vItem.index === libraryActiveIdx}
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
                            className={`draft-item ${isActive ? "is-active" : ""} ${isArchived ? "is-archived" : ""} ${vItem.index === libraryActiveIdx ? "is-keyboard-active" : ""}`}
                          >
                            <div className="draft-item-row">
                              <button
                                type="button"
                                className={`pin-btn ${meta.pinned ? "is-on" : ""}`}
                                onClick={() => m.togglePinned(id)}
                                aria-pressed={Boolean(meta.pinned)}
                                {...hint(meta.pinned ? "Unpin draft" : "Pin draft")}
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
                                {...hint("Open this draft in the editor")}
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
                                {...hint("Duplicate this draft")}
                              >
                                Dup
                              </button>
                              {isArchived ? (
                                <button
                                  type="button"
                                  className="small-btn"
                                  onClick={() => m.setDraftArchived(id, false)}
                                  {...hint("Return draft to main list")}
                                >
                                  Unarchive
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="small-btn"
                                  disabled={isActive}
                                  {...hint(
                                    isActive
                                      ? "Switch to another draft before archiving this one"
                                      : "Archive — hide from list (data kept)",
                                  )}
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
                              {(meta.tags ?? []).length > 0 && (
                                <div className="draft-tag-chips">
                                  {(meta.tags ?? []).map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      className={`draft-tag-chip ${libraryQuery === tag ? "is-active" : ""}`}
                                      onClick={() => setLibraryQuery(libraryQuery === tag ? "" : tag)}
                                      title={`Filter by tag: ${tag}`}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              )}
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

            <details className="drawer-accordion drawer-accordion-snapshots" open>
              <summary className="drawer-accordion-summary">
                Snapshots
                {m.revisions.length > 0 && (
                  <span className="drawer-accordion-badge">{m.revisions.length}</span>
                )}
              </summary>
              <div className="drawer-accordion-body">
                <div className="snapshot-save-row">
                  <input
                    type="text"
                    className="snapshot-label-input"
                    value={m.snapshotLabel}
                    onChange={(e) => m.setSnapshotLabel(e.target.value)}
                    placeholder="Optional label..."
                    autoComplete="off"
                    spellCheck={false}
                    onKeyDown={(e) => { if (e.key === "Enter") m.saveSnapshot(); }}
                  />
                  <button
                    type="button"
                    className="small-btn small-btn-primary"
                    onClick={m.saveSnapshot}
                    {...hint("Save a snapshot of the current poem")}
                  >
                    Save now
                  </button>
                </div>
                {m.revisions.length === 0 ? (
                  <p className="drawer-note snapshot-empty-note">
                    No snapshots yet. Save one before a big edit — you can restore it any time.
                  </p>
                ) : (
                  <div className="snapshot-history-list">
                    {m.revisions.map((snap) => (
                      <div key={snap.id} className="snapshot-history-item">
                        <div className="snapshot-history-meta">
                          <span
                            className="snapshot-history-when"
                            title={formatSnapshotWhen(snap.createdAt)}
                          >
                            {formatRelativeSnapshotWhen(snap.createdAt)}
                          </span>
                          {snap.label && snap.label !== "Auto" && (
                            <span className="snapshot-history-label">{snap.label}</span>
                          )}
                          {snap.label === "Auto" && (
                            <span className="snapshot-history-auto">auto</span>
                          )}
                          {snap.title && (
                            <span className="snapshot-history-title">{snap.title}</span>
                          )}
                          {snap.aiScore != null && (
                            <span className="snapshot-ai-score" title="AI score at time of snapshot">
                              ✦ {snap.aiScore}
                            </span>
                          )}
                        </div>
                        <div className="snapshot-history-actions">
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => {
                              if (window.confirm(`Restore to "${formatRelativeSnapshotWhen(snap.createdAt)}"${snap.label ? ` (${snap.label})` : ""}?\n\nThis will replace the current poem text.`)) {
                                m.restoreRevision(snap);
                                setIsLibraryOpen(false);
                              }
                            }}
                            {...hint("Restore poem to this snapshot")}
                          >
                            Restore
                          </button>
                          {pendingDeleteSnapId === snap.id ? (
                            <span className="snapshot-delete-confirm" role="group" aria-label="Confirm delete snapshot">
                              <button
                                type="button"
                                className="small-btn danger-btn"
                                onClick={() => {
                                  m.deleteRevision(snap.id);
                                  setPendingDeleteSnapId(null);
                                }}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                className="small-btn"
                                onClick={() => setPendingDeleteSnapId(null)}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="small-btn snapshot-delete-btn"
                              onClick={() => setPendingDeleteSnapId(snap.id)}
                              aria-label={`Delete snapshot from ${formatRelativeSnapshotWhen(snap.createdAt)}`}
                              {...hint("Delete this snapshot")}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>

            <details className="drawer-accordion">
              <summary className="drawer-accordion-summary">Fonts</summary>
              <div className="drawer-accordion-body">
                <p className="drawer-note">
                  Poem and UI fonts apply in this browser only. The top bar has
                  dedicated <strong>Fonts</strong> and <strong>Background</strong>{" "}
                  buttons.
                </p>
                <AppearanceFormFields
                  appearance={appearance}
                  onChange={setAppearance}
                />
              </div>
            </details>
            <details className="drawer-accordion">
              <summary className="drawer-accordion-summary">Page background</summary>
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
                <div className="drawer-note">
                  <strong>Background settings</strong> (strength + motion + low‑power)
                </div>
                <BackdropFormFields appearance={appearance} onChange={setAppearance} />
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
                    {...hint("Download all drafts and their snapshots as JSON")}
                  >
                    Export backup (JSON)
                  </button>
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => void m.triggerImportBackup()}
                    {...hint("Import drafts from an Easy-poems backup JSON file")}
                  >
                    Import backup (JSON)
                  </button>
                </div>
              </div>
            </details>
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
            {exportFlash ? (
              <p className="export-flash" role="status" aria-live="polite">
                {exportFlash}
              </p>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="small-btn" onClick={() => { m.onDownloadTxt(); doExportFlash("Downloaded .txt ✓"); }}>
                Download .txt
              </button>
              <button type="button" className="small-btn" onClick={() => { m.onDownloadMd(); doExportFlash("Downloaded .md ✓"); }}>
                Download .md
              </button>
              <button
                type="button"
                className="small-btn small-btn-primary"
                onClick={() => void m.onDownloadDocx().then(() => doExportFlash("Downloaded Word (.docx) ✓"))}
              >
                Download Word (.docx)
              </button>
              <button
                type="button"
                className="small-btn"
                onClick={() => void m.onCopyMarkdown().then(() => doExportFlash("Copied Markdown ✓"))}
                {...hint(
                  "Copy as Markdown: title becomes a heading, form note is italic, each line preserved — handy for Notion, GitHub, blogs, or ChatGPT.",
                )}
              >
                Copy Markdown
              </button>
              <button
                type="button"
                className="small-btn"
                onClick={() => window.print()}
                {...hint("Print or save as PDF via your browser’s print dialog")}
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
                  onClick={() => { m.exportWorkshopBackup(); doExportFlash("Backup downloaded"); }}
                  {...hint("Download all drafts and snapshots as a JSON backup")}
                >
                  Export backup (.json)
                </button>
                <button
                  type="button"
                  className="small-btn"
                  onClick={m.triggerImportBackup}
                  {...hint("Import a previously exported backup JSON file")}
                >
                  Import backup
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isShortcutsOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsShortcutsOpen(false);
          }}
        >
          <section
            className="modal shortcuts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-modal-title"
          >
            <div className="modal-head">
              <h2 id="shortcuts-modal-title" className="modal-title">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                className="small-btn"
                onClick={() => setIsShortcutsOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="shortcuts-modal-body">
              <KeyboardShortcutsContent />
            </div>
          </section>
        </div>
      ) : null}

      {isGuideOpen ? (
        <SpotlightTour onClose={() => setIsGuideOpen(false)} />
      ) : null}

      {isStyleOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsStyleOpen(false);
          }}
        >
          <section
            className="modal style-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-modal-title"
          >
            <div className="modal-head">
              <h2 id="style-modal-title" className="modal-title">Fonts &amp; Typography</h2>
              <button type="button" className="small-btn" onClick={() => setIsStyleOpen(false)}>
                Close
              </button>
            </div>
            <AppearanceFormFields appearance={appearance} onChange={setAppearance} />
            <label className="appearance-hints-toggle">
              <input
                type="checkbox"
                checked={hoverHintsEnabled}
                onChange={(e) => setHoverHintsEnabled(e.target.checked)}
              />
              <span>Show button hints on hover (hover devices only).</span>
            </label>
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
            className="modal style-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bg-modal-title"
          >
            <div className="modal-head">
              <h2 id="bg-modal-title" className="modal-title">Page Background</h2>
              <button type="button" className="small-btn" onClick={() => setIsBackgroundOpen(false)}>
                Close
              </button>
            </div>
            <BackgroundPicker
              appearance={appearance}
              background={appearance.background}
              onChange={setAppearance}
            />
            <div className="modal-note">
              <strong>Background settings</strong> (strength + motion + low‑power)
            </div>
            <BackdropFormFields appearance={appearance} onChange={setAppearance} />
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

      <div
        className="workshop-grid"
        ref={workshopGridRef}
        data-mobile-view={mobileToolsExpanded ? "tools" : "editor"}
      >
        <nav className={`workshop-rail ${isFocusMode ? "is-hidden" : ""}`} aria-label="Workshop shortcuts">
          <button
            type="button"
            className="rail-btn rail-btn-library"
            onClick={() => setIsLibraryOpen(true)}
            aria-label="Open library"
            data-tour-id="rail-library"
            aria-haspopup="dialog"
            aria-expanded={isLibraryOpen}
            {...hint("Open Library — manage drafts")}
          >
            <RailIcon>
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
            onClick={() => setIsStyleOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isStyleOpen}
            {...hint("Style — fonts, background and appearance")}
          >
            <RailIcon>
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M4 19l5-13 5 13M6 14h6" />
                <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M17 19v-5.5a2.5 2.5 0 0 1 5 0V19M15.5 16h4" />
              </svg>
            </RailIcon>
            <span className="rail-label">Style</span>
          </button>

          <button
            type="button"
            className="rail-btn rail-btn-primary"
            onClick={() => setIsExportOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isExportOpen}
            {...hint("Export — copy or download the poem and backups")}
          >
            <RailIcon>
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
            {...hint(
              isFocusMode
                ? "Exit focus mode — show tools and side rail again"
                : "Focus mode — hide tools for a calmer writing space",
            )}
          >
            <RailIcon>
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

          <button
            type="button"
            className="rail-btn rail-btn-guide"
            onClick={() => setIsGuideOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isGuideOpen}
            {...hint("Guide — how to use easywriting-poem")}
          >
            <RailIcon>
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 17v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 13.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5v1" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </RailIcon>
            <span className="rail-label">Guide</span>
          </button>
        </nav>

        <section
          className="editor-panel"
          aria-label="Poem editor"
          id="poem-draft"
          data-tour-id="poem-editor"
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
                  <div data-tour-id="format-toolbar">
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
                    showRhymeScheme={showRhymeScheme}
                    onShowRhymeSchemeChange={setShowRhymeScheme}
                    rhymeBreadth={rhymeBreadth}
                    onRhymeBreadthChange={setRhymeBreadth}
                    wordLookupEnabled={wordLookupEnabled}
                    onWordLookupToggle={() => {
                      const next = !wordLookupEnabled;
                      setWordLookupEnabled(next);
                      try { localStorage.setItem(STORAGE_KEY_WORD_LOOKUP_ENABLED, next ? "1" : "0"); } catch { /* ignore */ }
                    }}
                  />
                  </div>{/* /format-toolbar tour target */}
                </div>
                <div className="poem-editor-with-scheme">
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
                      persistentIssueHighlights={persistentIssueHighlights}
                      showLineSyllables={showLineSyllables}
                      onSelectionText={(text, rect) => {
                        setSelectionText(text);
                        setSelectionRect(rect);
                      }}
                    />
                    <WordLookupPopup
                      editorViewRef={m.editorViewRef}
                      enabled={wordLookupEnabled}
                      onDisable={() => {
                        setWordLookupEnabled(false);
                        try { localStorage.setItem(STORAGE_KEY_WORD_LOOKUP_ENABLED, "0"); } catch { /* ignore */ }
                      }}
                    />
                    {selectionText && selectionRect && (
                      <SelectionSuggestPopover
                        anchorRect={selectionRect}
                        selectedText={selectionText}
                        poemTitle={m.title}
                        poemLines={m.lines}
                        onApply={(text) => {
                          const view = m.editorViewRef.current;
                          if (!view) return;
                          const { from, to } = view.state.selection.main;
                          view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
                          m.onEditorBody(view.state.doc.toString());
                        }}
                        onClose={() => { setSelectionText(null); setSelectionRect(null); }}
                      />
                    )}
                    <div
                      className={`poem-editor-copy-box ${m.quickCopyFlash ? "is-copied" : ""}`}
                    >
                      <div className="poem-editor-copy-slot-inner">
                        <button
                          type="button"
                          className="quick-copy-face quick-copy-face-icon"
                          onClick={() => void m.onQuickCopyPlain()}
                          {...hint("Copy poem body as plain text (no title or form)")}
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
                  {showRhymeScheme && m.rhymeScheme.some((l) => l) ? (
                    <div className="editor-rhyme-scheme" aria-label="End-rhyme scheme">
                      {m.rhymeScheme.map((label, i) =>
                        label ? (
                          <span key={i} className="editor-rhyme-row">
                            <span className={`editor-rhyme-label rhyme-label-${label.charAt(0).toLowerCase()}`}>{label}</span>
                          </span>
                        ) : (
                          <span key={i} className="editor-rhyme-spacer" aria-hidden="true" />
                        ),
                      )}
                    </div>
                  ) : null}
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
          data-tour-id="tools-panel"
        >
          <div className="tools-sticky-head">
            <div className="tools-swipe-handle" aria-hidden />
            <div className="tools-head-row tools-head-row-simple">
              <div>
                <h2 className="tools-heading">Tools</h2>
                <p className="tools-panel-hint muted">Live analysis — updates as you write</p>
              </div>
              <button
                type="button"
                className="mobile-tools-panel-toggle"
                onClick={() => setMobileToolsExpanded(false)}
                aria-label="Back to editor"
              >
                Editor
              </button>
            </div>
            <div
              className="tool-bucket-row"
              role="tablist"
              aria-label="Tool groups"
              data-tour-id="tool-buckets"
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
                ({ id, label, desc, Icon }) => (
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
                    title={desc}
                  >
                    <Icon />
                    <span className="tool-tab-label">{label}</span>
                  </button>
                ),
              )}
            </nav>
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
            clicheHits={m.clicheHits}
            poemTitle={m.title}
            poemLines={m.lines}
            onInsertSuggestion={m.insertTextAtEnd}
            onReplaceLine={(lineNum, text) => m.applyLineRewrite(lineNum, lineNum, text)}
          />
        </aside>
      </div>

      <nav
        className={`mobile-actionbar mobile-actionbar-4 ${isFocusMode ? "is-hidden" : ""}`}
        aria-label="Workshop actions"
      >
        <button
          type="button"
          className={`mobile-action-btn mobile-action-btn-view ${mobileToolsExpanded ? "" : "mobile-action-btn-view-active"}`}
          onClick={() => setMobileToolsExpanded(false)}
          aria-pressed={!mobileToolsExpanded}
        >
          Write
        </button>
        <button
          type="button"
          className={`mobile-action-btn mobile-action-btn-view ${mobileToolsExpanded ? "mobile-action-btn-view-active" : ""}`}
          onClick={() => setMobileToolsExpanded(true)}
          aria-pressed={mobileToolsExpanded}
        >
          Tools
        </button>
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
      </nav>

      <AiAnalysis
        key={m.activePoemId}
        poemId={m.activePoemId}
        title={m.title}
        lines={m.lines}
        localAnalysis={localAnalysis}
        goals={m.goals}
        onJumpToLine={m.goToLine}
        onHighlightLines={(start, end, sev) => setIssueHighlight([start, end, sev])}
        onClearHighlight={() => setIssueHighlight(null)}
        onAnalysisDone={(issues, score) => {
          setPersistentIssueHighlights(
            issues.map((iss) => [iss.line_start, iss.line_end, iss.severity] as [number, number, string?])
          );
          m.setLastAiScore(score);
        }}
        onApplyLine={m.applyLineRewrite}
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

      {isShareOpen && (
        <ShareModal
          poem={{ title: m.title, body: m.body }}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {sharedPoemView && (
        <ViewSharedPoem
          poem={sharedPoemView}
          onDismiss={() => {
            setSharedPoemView(null);
            window.location.hash = "";
          }}
          onAddToDrafts={() => {
            m.newPoem();
            setTimeout(() => {
              m.setTitle(sharedPoemView.title);
              m.setBody(sharedPoemView.body);
            }, 50);
            setSharedPoemView(null);
            window.location.hash = "";
          }}
        />
      )}

      <footer className="privacy">
        <div className="privacy-top-row">
          <details className="privacy-details">
            <summary className="privacy-summary">
              Privacy — your drafts stay in this browser
            </summary>
          <div className="privacy-body">
            <p>
              No analytics, no accounts, no tracking. Drafts, snapshots, and settings
              are stored only in this browser's <code>localStorage</code> and are never
              sent to a server during normal editing.
            </p>
            <p>
              If you use the optional AI analysis feature, the poem text is sent to the
              configured AI provider for that request only. Exporting or copying sends
              text wherever you direct it — check that destination's terms.
            </p>
            <p>
              New to the layout?{" "}
              <button
                type="button"
                className="privacy-inline-link"
                onClick={() => setIsGuideOpen(true)}
              >
                Open the guide
              </button>
              {" "}any time.
            </p>
          </div>
          </details>
          <FeedbackWidget />
        </div>
      </footer>
    </div>
  );
}
