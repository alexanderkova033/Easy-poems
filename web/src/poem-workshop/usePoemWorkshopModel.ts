import type { EditorView } from "@codemirror/view";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { diffPoemLines } from "@/draft-library/diff-lines";
import {
  buildMarkdownPoem,
  buildPlainTextTitleBody,
  copyTextToClipboard,
  downloadDocxFile,
  downloadTextFile,
  exportFilename,
} from "@/draft-library/export-poem";
import { stripFormatMarkers } from "@/poem-editor/format-marks";
import {
  buildWorkshopExportJson,
  duplicateActivePoem,
  duplicatePoemById as duplicatePoemByIdInLib,
  loadOrCreateLibrary,
  mergeImportedPoems,
  newBlankPoemAfter,
  poemById,
  removePoem,
  saveLibrary,
  setActivePoem,
  upsertActivePoem,
  type DraftLibrary,
} from "@/draft-library/local-draft-library";
import {
  loadDraftMetaMap,
  saveDraftMetaMap,
  upsertDraftMeta,
  type DraftMetaMap,
} from "@/draft-library/library-meta";
import {
  migrateLegacyDraftIfNeeded,
  type SpellMode,
} from "@/draft-library/local-draft-storage";
import {
  addRevision,
  loadRevisions,
  removeRevision,
  removeRevisionsForPoem,
  type RevisionSnapshot,
} from "@/draft-library/revision-snapshots";
import {
  loadWorkshopGoals,
  saveWorkshopGoals,
  type WorkshopGoals,
} from "@/draft-library/workshop-goals";
import { loadPersonalDictionary, loadSessionIgnores } from "@/spellcheck/personal-dictionary";
import { loadEnglishWordlist } from "@/spellcheck/wordlist";
import type { SpellHit } from "@/spellcheck/scan";
import { spellHitsFromText } from "@/spellcheck/scan";
import { SPELL_ANALYSIS_DEBOUNCE_MS } from "@/spellcheck/spell-timing";
import { evaluateGoals } from "@/writing-tools/goal-metrics";
import { linesFromBody } from "@/writing-tools/lines-from-body";
import {
  computeDocumentStats,
  computeQuickDocumentStats,
} from "@/writing-tools/line-stats";
import { loadStressLexicon } from "@/writing-tools/cmu-stress-lexicon";
import {
  meterHintsForBody,
  summarizeMeterCoverage,
} from "@/writing-tools/meter-hints";
import { findRepeatedWords } from "@/writing-tools/repeated-words";
import { buildPublicationChecklist } from "@/writing-tools/publication-checklist";
import {
  lightAssonanceClusters,
  lightConsonanceClusters,
  lightVowelTailClusters,
  roughRhymeClusters,
} from "@/writing-tools/rhyme-hints";
import {
  focusCharacterRangeInEditor,
  focusLineInEditor,
} from "@/poem-editor/focus-line-in-editor";
import { isTypingInField } from "./keyboard-field-target";
import { TOOL_TABS } from "./ToolTabBar";
import {
  COMPARE_CURRENT_ID,
  compareBodyForId,
  formatRelativeSnapshotWhen,
  formatSnapshotWhen,
  parseGoalInput,
  type ToolTab,
} from "./workshop-helpers";

const LAST_TOOL_TAB_KEY = "easy-poems:lastToolTab";

function shouldForceSummaryTools(): boolean {
  try {
    return window.matchMedia("(max-width: 899px)").matches;
  } catch {
    return false;
  }
}

function readSessionToolTab(): ToolTab {
  const allowed = new Set(TOOL_TABS.map((x) => x.id));
  try {
    const raw = sessionStorage.getItem(LAST_TOOL_TAB_KEY);
    if (shouldForceSummaryTools()) return "totals";
    if (raw && allowed.has(raw as ToolTab)) return raw as ToolTab;
  } catch {
    /* sessionStorage unavailable */
  }
  return "totals";
}

const DRAFT_STORAGE_MSG =
  "Could not save your drafts to this browser (storage may be full or blocked).";
const GOALS_STORAGE_MSG =
  "Could not save your writing goals to browser storage.";
const SNAPSHOT_SAVE_MSG =
  "Could not save the snapshot (browser storage may be full or blocked).";
const SNAPSHOT_DELETE_MSG =
  "Could not update snapshots in browser storage.";

export function usePoemWorkshopModel() {
  const [library, setLibrary] = useState<DraftLibrary>(() => {
    migrateLegacyDraftIfNeeded();
    return loadOrCreateLibrary();
  });
  const [meta, setMeta] = useState<DraftMetaMap>(() => loadDraftMetaMap());
  const [title, setTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [body, setBody] = useState("");
  /** Debounced copy of `body` for expensive sidebar tools (meter, rhyme, repeats). */
  const [heavyBody, setHeavyBody] = useState("");
  const [spellMode, setSpellMode] = useState<SpellMode>("permissive");
  const [savedFlash, setSavedFlash] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [wordlist, setWordlist] = useState<Set<string> | null>(null);
  const [wordlistErr, setWordlistErr] = useState<string | null>(null);
  const [stressLexicon, setStressLexicon] = useState<Map<
    string,
    string
  > | null>(null);
  const [stressLexiconErr, setStressLexiconErr] = useState<string | null>(
    null,
  );
  const [spellBump, setSpellBump] = useState(0);
  const [spellNavIndex, setSpellNavIndex] = useState(0);
  const [revisions, setRevisions] = useState<RevisionSnapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [compareLeftId, setCompareLeftId] = useState(COMPARE_CURRENT_ID);
  const [compareRightId, setCompareRightId] = useState(COMPARE_CURRENT_ID);
  const [compareViewMode, setCompareViewMode] = useState<"side" | "diff">(
    "side",
  );
  const [goals, setGoals] = useState<WorkshopGoals>(() => loadWorkshopGoals());
  const [copyExportFlash, setCopyExportFlash] = useState(false);
  const [quickCopyFlash, setQuickCopyFlash] = useState(false);
  const [docxExportErr, setDocxExportErr] = useState<string | null>(null);
  const [jumpLine, setJumpLine] = useState<number | null>(null);
  const [jumpBump, setJumpBump] = useState(0);
  const copyExportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [toolTab, setToolTabInner] = useState<ToolTab>(() =>
    readSessionToolTab(),
  );
  const setToolTab = useCallback((t: ToolTab) => {
    setToolTabInner(t);
    try {
      sessionStorage.setItem(LAST_TOOL_TAB_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const activePoemId = library.activeId;

  const workshopStateRef = useRef({
    title,
    body,
    formNote,
    spellMode,
    library,
  });
  workshopStateRef.current = { title, body, formNote, spellMode, library };

  const initialHydrateRef = useRef(false);
  useLayoutEffect(() => {
    if (initialHydrateRef.current) return;
    initialHydrateRef.current = true;
    const p = poemById(library, library.activeId);
    if (!p) return;
    setTitle(p.title);
    setBody(p.body);
    setHeavyBody(p.body);
    setFormNote(p.form ?? "");
    setSpellMode(p.spellMode ?? "permissive");
    setRevisions(loadRevisions(library.activeId));
  }, [library]);

  const dismissPersistenceError = useCallback(() => {
    setPersistenceError(null);
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => setHeavyBody(body),
      SPELL_ANALYSIS_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [body]);

  useEffect(() => {
    if (wordlist) setSpellBump((n) => n + 1);
  }, [wordlist]);

  useEffect(() => {
    void loadEnglishWordlist()
      .then((w) => {
        setWordlist(w);
        setWordlistErr(null);
      })
      .catch((e) => {
        setWordlistErr(e instanceof Error ? e.message : "Could not load word list.");
      });
  }, []);

  useEffect(() => {
    void loadStressLexicon()
      .then((m) => {
        setStressLexicon(m);
        setStressLexiconErr(null);
      })
      .catch((e) => {
        setStressLexicon(null);
        setStressLexiconErr(
          e instanceof Error ? e.message : "Could not load stress dictionary.",
        );
      });
  }, []);

  useEffect(() => {
    if (!saveWorkshopGoals(goals)) {
      setPersistenceError(GOALS_STORAGE_MSG);
      return;
    }
    setPersistenceError((prev) => (prev === GOALS_STORAGE_MSG ? null : prev));
  }, [goals]);

  useEffect(() => {
    setCompareLeftId((left) => {
      if (left === COMPARE_CURRENT_ID) return left;
      return revisions.some((s) => s.id === left) ? left : COMPARE_CURRENT_ID;
    });
    setCompareRightId((right) => {
      if (right === COMPARE_CURRENT_ID) return right;
      if (revisions.some((s) => s.id === right)) return right;
      return revisions[0]?.id ?? COMPARE_CURRENT_ID;
    });
  }, [revisions]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLibrary((prev) => {
        const next = upsertActivePoem(prev, {
          title,
          body,
          form: formNote,
          spellMode,
        });
        if (!saveLibrary(next)) {
          setPersistenceError(DRAFT_STORAGE_MSG);
          return prev;
        }
        setPersistenceError((p) => (p === DRAFT_STORAGE_MSG ? null : p));
        setSavedFlash(true);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSavedFlash(false), 900);
        return next;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [title, body, formNote, spellMode, activePoemId]);

  const lines = useMemo(() => linesFromBody(body), [body]);
  const heavyLines = useMemo(() => linesFromBody(heavyBody), [heavyBody]);
  const quickDocStats = useMemo(
    () => computeQuickDocumentStats(body),
    [body],
  );
  const docStats = useMemo(
    () => computeDocumentStats(heavyBody),
    [heavyBody],
  );
  const meterHints = useMemo(
    () => meterHintsForBody(heavyBody, stressLexicon),
    [heavyBody, stressLexicon],
  );
  const rhymeClusters = useMemo(
    () => roughRhymeClusters(heavyLines),
    [heavyLines],
  );
  const vowelTailClusters = useMemo(
    () => lightVowelTailClusters(heavyLines),
    [heavyLines],
  );
  const assonanceClusters = useMemo(
    () => lightAssonanceClusters(heavyLines),
    [heavyLines],
  );
  const consonanceClusters = useMemo(
    () => lightConsonanceClusters(heavyLines),
    [heavyLines],
  );
  const repeated = useMemo(() => findRepeatedWords(heavyLines), [heavyLines]);
  const heavyToolsStale = body !== heavyBody;
  const heavyDocStats = useMemo(
    () => computeDocumentStats(heavyBody),
    [heavyBody],
  );
  const meterCoverageSummary = useMemo(
    () => summarizeMeterCoverage(meterHints, heavyDocStats),
    [meterHints, heavyDocStats],
  );
  const spellHits = useMemo(() => {
    if (!wordlist) return [];
    return spellHitsFromText(
      heavyBody,
      wordlist,
      loadPersonalDictionary(),
      loadSessionIgnores(),
      spellMode,
    );
  }, [heavyBody, wordlist, spellMode, spellBump]);

  useEffect(() => {
    setSpellNavIndex(0);
  }, [spellHits]);

  const goalEvaluation = useMemo(
    () => evaluateGoals(docStats, goals),
    [docStats, goals],
  );

  const publication = useMemo(
    () =>
      buildPublicationChecklist({
        title,
        docStats,
        spellingFlagCount: spellHits.length,
        wordlistReady: Boolean(wordlist),
        goalEvaluation,
      }),
    [title, docStats, spellHits.length, wordlist, goalEvaluation],
  );

  const compareLeftBody = useMemo(
    () => compareBodyForId(compareLeftId, body, revisions),
    [compareLeftId, body, revisions],
  );
  const compareRightBody = useMemo(
    () => compareBodyForId(compareRightId, body, revisions),
    [compareRightId, body, revisions],
  );

  const compareDiffRows = useMemo(() => {
    if (compareLeftId === compareRightId) return [];
    return diffPoemLines(compareLeftBody, compareRightBody);
  }, [
    compareLeftBody,
    compareRightBody,
    compareLeftId,
    compareRightId,
  ]);

  const compareSnapshotOptions = useMemo(() => {
    const opts: { id: string; label: string; optionTitle?: string }[] = [
      { id: COMPARE_CURRENT_ID, label: "Current draft" },
      ...revisions.map((s) => ({
        id: s.id,
        label: `${formatRelativeSnapshotWhen(s.createdAt)}${s.label ? ` — ${s.label}` : ""}`,
        optionTitle: formatSnapshotWhen(s.createdAt),
      })),
    ];
    return opts;
  }, [revisions]);

  const goToLine = useCallback((line1Based: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    setJumpLine(line1Based);
    setJumpBump((n) => n + 1);
    focusLineInEditor(view, line1Based);
  }, []);

  const goToSpellHit = useCallback((hit: SpellHit) => {
    const view = editorViewRef.current;
    if (!view) return;
    setJumpLine(hit.lineNumber);
    setJumpBump((n) => n + 1);
    if (body === heavyBody) {
      focusCharacterRangeInEditor(view, hit.docFrom, hit.docTo);
      return;
    }
    focusLineInEditor(view, hit.lineNumber);
  }, [body, heavyBody]);

  const goToSpellHitAt = useCallback(
    (hit: SpellHit) => {
      const idx = spellHits.indexOf(hit);
      if (idx >= 0) setSpellNavIndex(idx);
      goToSpellHit(hit);
    },
    [spellHits, goToSpellHit],
  );

  const cycleSpellHit = useCallback(
    (delta: number) => {
      const n = spellHits.length;
      if (n === 0) return;
      setSpellNavIndex((prev) => {
        const next = (prev + delta + n) % n;
        const h = spellHits[next];
        if (h) queueMicrotask(() => goToSpellHit(h));
        return next;
      });
    },
    [spellHits, goToSpellHit],
  );

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey) return;
      if (e.key !== "," && e.key !== ".") return;
      if (isTypingInField(e.target)) return;
      if (spellHits.length === 0) return;
      e.preventDefault();
      const delta = e.key === "." ? 1 : -1;
      cycleSpellHit(delta);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [spellHits.length, cycleSpellHit]);

  const applySpellSuggestion = useCallback(
    (hit: SpellHit, replacement: string) => {
      if (body !== heavyBody) return false;
      const view = editorViewRef.current;
      if (!view) return false;
      if (view.state.doc.toString() !== body) return false;
      const { docFrom: from, docTo: to, word } = hit;
      const docLen = view.state.doc.length;
      if (from < 0 || to > docLen || from > to) return false;
      if (view.state.doc.sliceString(from, to) !== word) return false;
      view.dispatch({
        changes: { from, to, insert: replacement },
        selection: { anchor: from + replacement.length },
        scrollIntoView: true,
      });
      view.focus();
      return true;
    },
    [body, heavyBody],
  );

  const refreshSpell = useCallback(() => {
    setSpellBump((n) => n + 1);
  }, []);

  const applyLoadedPoem = useCallback((lib: DraftLibrary) => {
    const p = poemById(lib, lib.activeId);
    if (!p) return;
    setTitle(p.title);
    setBody(p.body);
    setHeavyBody(p.body);
    setFormNote(p.form ?? "");
    setSpellMode(p.spellMode ?? "permissive");
    setRevisions(loadRevisions(lib.activeId));
  }, []);

  const selectPoem = useCallback(
    (poemId: string) => {
      if (poemId === activePoemId) return;
      const flushed = upsertActivePoem(library, {
        title,
        body,
        form: formNote,
        spellMode,
      });
      if (!saveLibrary(flushed)) {
        setPersistenceError(DRAFT_STORAGE_MSG);
        return;
      }
      const next = setActivePoem(flushed, poemId);
      if (!next) return;
      if (!saveLibrary(next)) {
        setPersistenceError(DRAFT_STORAGE_MSG);
        return;
      }
      setLibrary(next);
      // Update last-opened metadata (best effort).
      setMeta((prev) => {
        const patched = upsertDraftMeta(prev, poemId, {
          lastOpenedAt: new Date().toISOString(),
        });
        void saveDraftMetaMap(patched);
        return patched;
      });
      applyLoadedPoem(next);
    },
    [activePoemId, library, title, body, formNote, spellMode, applyLoadedPoem],
  );

  const newPoem = useCallback(() => {
    const flushed = upsertActivePoem(library, {
      title,
      body,
      form: formNote,
      spellMode,
    });
    if (!saveLibrary(flushed)) {
      setPersistenceError(DRAFT_STORAGE_MSG);
      return;
    }
    const next = newBlankPoemAfter(flushed);
    if (!saveLibrary(next)) {
      setPersistenceError(DRAFT_STORAGE_MSG);
      return;
    }
    setLibrary(next);
    applyLoadedPoem(next);
  }, [library, title, body, formNote, spellMode, applyLoadedPoem]);

  const duplicatePoem = useCallback(() => {
    const flushed = upsertActivePoem(library, {
      title,
      body,
      form: formNote,
      spellMode,
    });
    if (!saveLibrary(flushed)) {
      setPersistenceError(DRAFT_STORAGE_MSG);
      return;
    }
    const next = duplicateActivePoem(flushed);
    if (!next || !saveLibrary(next)) {
      setPersistenceError(DRAFT_STORAGE_MSG);
      return;
    }
    setLibrary(next);
    applyLoadedPoem(next);
  }, [library, title, body, formNote, spellMode, applyLoadedPoem]);

  const duplicatePoemById = useCallback(
    (poemId: string) => {
      const flushed = upsertActivePoem(library, {
        title,
        body,
        form: formNote,
        spellMode,
      });
      if (!saveLibrary(flushed)) {
        setPersistenceError(DRAFT_STORAGE_MSG);
        return;
      }
      const next = duplicatePoemByIdInLib(flushed, poemId);
      if (!next || !saveLibrary(next)) {
        setPersistenceError(DRAFT_STORAGE_MSG);
        return;
      }
      setLibrary(next);
      applyLoadedPoem(next);
    },
    [library, title, body, formNote, spellMode, applyLoadedPoem],
  );

  const deleteCurrentPoem = useCallback(() => {
    if (library.poems.length <= 1) {
      window.alert("You only have one draft; add another before deleting this one.");
      return;
    }
    if (
      !window.confirm(
        "Delete this draft from this browser? Its snapshots for this poem will be removed too.",
      )
    ) {
      return;
    }
    const id = activePoemId;
    removeRevisionsForPoem(id);
    const flushed = upsertActivePoem(library, {
      title,
      body,
      form: formNote,
      spellMode,
    });
    const without = removePoem(flushed, id);
    if (!saveLibrary(without)) {
      setPersistenceError(DRAFT_STORAGE_MSG);
      return;
    }
    setLibrary(without);
    applyLoadedPoem(without);
  }, [
    library,
    library.poems.length,
    activePoemId,
    title,
    body,
    formNote,
    spellMode,
    applyLoadedPoem,
  ]);

  const exportWorkshopBackup = useCallback(() => {
    const json = buildWorkshopExportJson({
      poems: library.poems,
      revisionsForPoem: loadRevisions,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`easy-poems-backup-${stamp}.json`, json);
  }, [library.poems]);

  const triggerImportBackup = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const onImportBackupFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        const { title: t, body: b, formNote: f, spellMode: sm, library: lib } =
          workshopStateRef.current;
        const flushed = upsertActivePoem(lib, {
          title: t,
          body: b,
          form: f,
          spellMode: sm,
        });
        if (!saveLibrary(flushed)) {
          setPersistenceError(DRAFT_STORAGE_MSG);
          return;
        }
        const merged = mergeImportedPoems(flushed, text);
        if ("error" in merged) {
          setImportNotice(merged.error);
          return;
        }
        if (!saveLibrary(merged.lib)) {
          setPersistenceError(DRAFT_STORAGE_MSG);
          return;
        }
        setImportNotice(`Imported ${merged.added} poem(s).`);
        setLibrary(merged.lib);
        applyLoadedPoem(merged.lib);
      };
      reader.readAsText(file, "utf-8");
    },
    [applyLoadedPoem],
  );

  const dismissImportNotice = useCallback(() => {
    setImportNotice(null);
  }, []);

  const saveSnapshot = useCallback(() => {
    const result = addRevision(activePoemId, revisions, {
      title,
      body,
      form: formNote.trim() || undefined,
      label: snapshotLabel.trim() || undefined,
    });
    if (!result.ok) {
      setPersistenceError(SNAPSHOT_SAVE_MSG);
      return;
    }
    setPersistenceError((prev) =>
      prev === SNAPSHOT_SAVE_MSG ? null : prev,
    );
    const next = result.revisions;
    setRevisions(next);
    setSnapshotLabel("");
    setCompareLeftId((left) =>
      left === COMPARE_CURRENT_ID || (left && next.some((s) => s.id === left))
        ? left
        : COMPARE_CURRENT_ID,
    );
    setCompareRightId((right) => {
      if (right === COMPARE_CURRENT_ID) return right;
      if (right && next.some((s) => s.id === right)) return right;
      return next[0]?.id ?? COMPARE_CURRENT_ID;
    });
  }, [activePoemId, revisions, title, body, formNote, snapshotLabel]);

  const restoreRevision = useCallback((snap: RevisionSnapshot) => {
    setTitle(snap.title);
    setBody(snap.body);
    setHeavyBody(snap.body);
    setFormNote(snap.form ?? "");
  }, []);

  const deleteRevision = useCallback(
    (id: string) => {
      const result = removeRevision(activePoemId, revisions, id);
      if (!result.ok) {
        setPersistenceError(SNAPSHOT_DELETE_MSG);
        return;
      }
      setPersistenceError((prev) =>
        prev === SNAPSHOT_DELETE_MSG ? null : prev,
      );
      const next = result.revisions;
      setRevisions(next);
      if (next.length === 0) {
        setCompareLeftId(COMPARE_CURRENT_ID);
        setCompareRightId(COMPARE_CURRENT_ID);
        return;
      }
      let newLeft = compareLeftId;
      let newRight = compareRightId;
      if (newLeft !== COMPARE_CURRENT_ID && !next.some((s) => s.id === newLeft)) {
        newLeft = COMPARE_CURRENT_ID;
      }
      if (newRight !== COMPARE_CURRENT_ID && !next.some((s) => s.id === newRight)) {
        newRight = next[0]!.id;
      }
      if (newLeft === COMPARE_CURRENT_ID && newRight === COMPARE_CURRENT_ID) {
        newRight = next[0]!.id;
      } else if (newLeft === newRight) {
        newRight =
          next.find((s) => s.id !== newLeft)?.id ?? COMPARE_CURRENT_ID;
      }
      setCompareLeftId(newLeft);
      setCompareRightId(newRight);
    },
    [activePoemId, revisions, compareLeftId, compareRightId],
  );

  const onDownloadTxt = useCallback(() => {
    const text = buildPlainTextTitleBody(
      title,
      formNote.trim() || undefined,
      stripFormatMarkers(body),
    );
    downloadTextFile(exportFilename(title, "txt"), text);
  }, [title, formNote, body]);

  const onDownloadMd = useCallback(() => {
    // Keep **bold** (valid markdown) but strip __underline__ (no markdown equivalent)
    const cleanBody = body.replace(/__(.+?)__/g, "$1");
    const text = buildMarkdownPoem(
      title,
      formNote.trim() || undefined,
      cleanBody,
    );
    downloadTextFile(exportFilename(title, "md"), text);
  }, [title, formNote, body]);

  const onCopyMarkdown = useCallback(async () => {
    const cleanBody = body.replace(/__(.+?)__/g, "$1");
    const text = buildMarkdownPoem(
      title,
      formNote.trim() || undefined,
      cleanBody,
    );
    await copyTextToClipboard(text);
    setCopyExportFlash(true);
    if (copyExportTimer.current) clearTimeout(copyExportTimer.current);
    copyExportTimer.current = setTimeout(() => setCopyExportFlash(false), 1200);
  }, [title, formNote, body]);

  const onQuickCopyPlain = useCallback(async () => {
    await copyTextToClipboard(stripFormatMarkers(body));
    setQuickCopyFlash(true);
    if (quickCopyTimer.current) clearTimeout(quickCopyTimer.current);
    quickCopyTimer.current = setTimeout(() => setQuickCopyFlash(false), 1200);
  }, [body]);

  const onDownloadDocx = useCallback(async () => {
    setDocxExportErr(null);
    try {
      await downloadDocxFile(
        exportFilename(title, "docx"),
        title,
        formNote.trim() || undefined,
        stripFormatMarkers(body),
      );
    } catch (e) {
      setDocxExportErr(
        e instanceof Error ? e.message : "Could not build the Word file.",
      );
    }
  }, [title, formNote, body]);

  const updateGoal =
    (key: keyof WorkshopGoals) => (e: ChangeEvent<HTMLInputElement>) => {
      const v = parseGoalInput(e.target.value);
      setGoals((g) => ({ ...g, [key]: v }));
    };

  const onSpellPersistenceError = useCallback((message: string) => {
    setPersistenceError(message);
  }, []);

  const poemOptions = useMemo(() => {
    const labelFor = (p: (typeof library.poems)[0]) =>
      meta[p.id]?.label?.trim() || p.title.trim() || "Untitled";
    return library.poems
      .slice()
      .filter(
        (p) =>
          !meta[p.id]?.archived || p.id === library.activeId,
      )
      .sort((a, b) => {
        const ma = meta[a.id] ?? {};
        const mb = meta[b.id] ?? {};
        const pa = ma.pinned ? 1 : 0;
        const pb = mb.pinned ? 1 : 0;
        if (pa !== pb) return pb - pa;
        const oa = ma.lastOpenedAt ? new Date(ma.lastOpenedAt).getTime() : 0;
        const ob = mb.lastOpenedAt ? new Date(mb.lastOpenedAt).getTime() : 0;
        if (oa !== ob) return ob - oa;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .map((p) => ({
        id: p.id,
        label: labelFor(p),
        archived: Boolean(meta[p.id]?.archived),
      }));
  }, [library.poems, library.activeId, meta]);

  const setDraftLabel = useCallback((poemId: string, label: string) => {
    setMeta((prev) => {
      const patched = upsertDraftMeta(prev, poemId, { label });
      void saveDraftMetaMap(patched);
      return patched;
    });
  }, []);

  const togglePinned = useCallback((poemId: string) => {
    setMeta((prev) => {
      const pinned = Boolean(prev[poemId]?.pinned);
      const patched = upsertDraftMeta(prev, poemId, { pinned: !pinned });
      void saveDraftMetaMap(patched);
      return patched;
    });
  }, []);

  const setDraftTags = useCallback((poemId: string, tags: string[]) => {
    setMeta((prev) => {
      const patched = upsertDraftMeta(prev, poemId, { tags });
      void saveDraftMetaMap(patched);
      return patched;
    });
  }, []);

  const setDraftArchived = useCallback(
    (poemId: string, archived: boolean) => {
      setMeta((prev) => {
        const patched = upsertDraftMeta(prev, poemId, { archived });
        void saveDraftMetaMap(patched);
        return patched;
      });
    },
    [],
  );

  return {
    title,
    setTitle,
    formNote,
    setFormNote,
    body,
    setBody,
    spellMode,
    setSpellMode,
    savedFlash,
    persistenceError,
    dismissPersistenceError,
    importNotice,
    dismissImportNotice,
    wordlist,
    wordlistErr,
    spellBump,
    editorViewRef,
    snapshotLabel,
    setSnapshotLabel,
    saveSnapshot,
    restoreRevision,
    deleteRevision,
    revisions,
    compareLeftId,
    compareRightId,
    setCompareLeftId,
    setCompareRightId,
    compareViewMode,
    setCompareViewMode,
    compareSnapshotOptions,
    compareLeftBody,
    compareRightBody,
    compareDiffRows,
    copyExportFlash,
    quickCopyFlash,
    docxExportErr,
    onDownloadTxt,
    onDownloadMd,
    onDownloadDocx,
    onCopyMarkdown,
    onQuickCopyPlain,
    toolTab,
    setToolTab,
    lines,
    quickDocStats,
    docStats,
    meterHints,
    stressLexiconReady: Boolean(stressLexicon),
    stressLexiconErr,
    rhymeClusters,
    vowelTailClusters,
    assonanceClusters,
    consonanceClusters,
    repeated,
    spellHits,
    heavyToolsStale,
    meterCoverageSummary,
    goals,
    goalEvaluation,
    publication,
    goToLine,
    goToSpellHit,
    goToSpellHitAt,
    cycleSpellHit,
    spellNavIndex,
    applySpellSuggestion,
    refreshSpell,
    updateGoal,
    onSpellPersistenceError,
    jumpLine,
    jumpBump,
    activePoemId,
    library,
    poemOptions,
    draftMeta: meta,
    setDraftLabel,
    togglePinned,
    setDraftTags,
    setDraftArchived,
    selectPoem,
    newPoem,
    duplicatePoem,
    duplicatePoemById,
    deleteCurrentPoem,
    exportWorkshopBackup,
    triggerImportBackup,
    onImportBackupFile,
    importInputRef,
  };
}
