interface MobileActionBarProps {
  isFocusMode: boolean;
  mobileToolsExpanded: boolean;
  isLibraryOpen: boolean;
  isExportOpen: boolean;
  onShowEditor: () => void;
  onShowTools: () => void;
  onOpenLibrary: () => void;
  onOpenExport: () => void;
  /** Floating Analyse FAB — only shown on editor slide */
  onAnalyse: () => void;
  analyseVisible: boolean;
}

export function MobileActionBar({
  isFocusMode,
  mobileToolsExpanded,
  isLibraryOpen,
  isExportOpen,
  onShowEditor,
  onShowTools,
  onOpenLibrary,
  onOpenExport,
  onAnalyse,
  analyseVisible,
}: MobileActionBarProps) {
  return (
    <>
      {analyseVisible && !isFocusMode && (
        <button
          type="button"
          className="mobile-analyse-fab"
          aria-label="Analyse poem"
          onClick={onAnalyse}
        >
          ✦ Analyse
        </button>
      )}

      <nav
        className={`mobile-actionbar mobile-actionbar-4 ${isFocusMode ? "is-hidden" : ""}`}
        aria-label="Workshop actions"
      >
        <button
          type="button"
          className={`mobile-action-btn mobile-action-btn-view ${mobileToolsExpanded ? "" : "mobile-action-btn-view-active"}`}
          onClick={onShowEditor}
          aria-pressed={!mobileToolsExpanded}
        >
          Write
        </button>
        <button
          type="button"
          className={`mobile-action-btn mobile-action-btn-view ${mobileToolsExpanded ? "mobile-action-btn-view-active" : ""}`}
          onClick={onShowTools}
          aria-pressed={mobileToolsExpanded}
        >
          Tools
        </button>
        <button
          type="button"
          className="mobile-action-btn"
          onClick={onOpenLibrary}
          aria-haspopup="dialog"
          aria-expanded={isLibraryOpen}
        >
          Library
        </button>
        <button
          type="button"
          className="mobile-action-btn mobile-action-btn-primary"
          onClick={onOpenExport}
          aria-haspopup="dialog"
          aria-expanded={isExportOpen}
        >
          Export
        </button>
      </nav>
    </>
  );
}
