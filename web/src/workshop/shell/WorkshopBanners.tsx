import type { ReactElement } from "react";
import type { usePoemWorkshopModel } from "./usePoemWorkshopModel";
import { AiBudgetBanner } from "@/workshop/ai-cost/AiBudgetBanner";
import { useIsNarrowViewport } from "./hooks/useIsNarrowViewport";

type Model = ReturnType<typeof usePoemWorkshopModel>;

export function WorkshopBanners({ m }: { m: Model }) {
  const narrow = useIsNarrowViewport();

  // Highest urgency first: losing work beats a broken feature, which beats
  // feedback about an action just taken, which beats a periodic nudge.
  const banners: Array<[boolean, ReactElement]> = [
    [
      Boolean(m.persistenceError),
      <div
        key="persistence"
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
      </div>,
    ],
    [
      Boolean(m.wordlistErr),
      <div key="wordlist" className="spell-warn-banner" role="status" aria-live="polite">
        <p className="spell-warn-banner-text">
          Spell check unavailable: {m.wordlistErr}
        </p>
        <button type="button" className="small-btn spell-warn-retry-btn" onClick={m.retryWordlist}>
          Retry
        </button>
      </div>,
    ],
    [
      Boolean(m.importNotice),
      <div
        key="import"
        className={`import-notice-banner ${m.importNoticeKind === "error" ? "is-error" : "is-success"}`}
        role="status"
        aria-live="polite"
      >
        <p className="import-notice-text">{m.importNotice}</p>
        <button type="button" className="small-btn import-notice-dismiss" onClick={m.dismissImportNotice}>
          Dismiss
        </button>
      </div>,
    ],
    [
      Boolean(m.showExportReminder),
      <div key="export-reminder" className="import-notice-banner" role="status" aria-live="polite">
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
      </div>,
    ],
  ];

  const active = banners.filter(([shown]) => shown).map(([, el]) => el);

  // On a phone show only the most urgent one and let the others wait their turn:
  // each banner is ~90–180px, so two or three stacked push the poem off-screen
  // entirely. Nothing is dropped — dismissing the top one reveals the next.
  // Desktop has the room, so it keeps showing them all at once.
  const visible = narrow ? active.slice(0, 1) : active;

  return (
    <>
      <AiBudgetBanner />
      {visible}
    </>
  );
}
