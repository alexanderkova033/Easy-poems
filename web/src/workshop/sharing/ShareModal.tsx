import { useState, useCallback } from "react";
import "./ShareModal.css";
import type { SharedPoem } from "./sharing";
import { buildShareUrl } from "./sharing";
import { POST_SITES, SHARE_FILE_FORMATS, type PostSite, type ShareFileFormat } from "./share-targets";

interface ShareModalProps {
  poem: SharedPoem;
  onClose: () => void;
  onCopyToDrafts?: () => void;
  /** Saves the current poem as a file. Wired to the same export actions the
   *  Export modal uses, so the formats stay in one implementation. */
  onSaveAs?: (format: ShareFileFormat) => void;
}

export function ShareModal({ poem, onClose, onCopyToDrafts, onSaveAs }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [postedNotice, setPostedNotice] = useState<string | null>(null);
  const url = buildShareUrl(poem);
  const poemText = poem.title ? `${poem.title}\n\n${poem.body}` : poem.body;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [url]);

  // The OS share sheet — the one path that reaches every app on the phone,
  // including whichever poetry site the writer uses that isn't listed below.
  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: poem.title || "A poem", text: poemText, url });
    } catch { /* the user dismissed the sheet, or the browser refused */ }
  }, [poem.title, poemText, url]);

  const handlePostTo = useCallback(async (site: PostSite) => {
    // Copy first, then open: these sites have no post API, so the writer pastes
    // into their editor. Doing it in this order means the clipboard write is
    // still inside the click's user gesture.
    let ok = false;
    try {
      await navigator.clipboard.writeText(poemText);
      ok = true;
    } catch { /* clipboard blocked — the tab still opens */ }
    setPostedNotice(ok
      ? `Poem copied — paste it into ${site.label}.`
      : `Copy the poem yourself, then paste it into ${site.label}.`);
    window.open(site.url, "_blank", "noopener,noreferrer");
  }, [poemText]);

  return (
    <div className="share-overlay" role="dialog" aria-modal aria-label="Share poem">
      <div className="share-modal">
        <div className="share-modal-head">
          <h2 className="share-modal-title">Share poem</h2>
          <button type="button" className="share-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="share-desc muted small">
          Anyone with this link can view a read-only copy of your poem. Nothing is stored on a server — the poem is encoded in the URL itself.
        </p>
        {poem.title && (
          <p className="share-poem-title">{poem.title}</p>
        )}
        <div className="share-url-row">
          <input
            type="text"
            className="share-url-input"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            aria-label="Share URL"
          />
          <button
            type="button"
            className={`small-btn share-copy-btn${copied ? " is-copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        {canNativeShare && (
          <div className="share-actions">
            <button type="button" className="small-btn small-btn-primary share-native-btn" onClick={() => void handleNativeShare()}>
              Share…
            </button>
            <span className="muted small">Send it to any app on this device</span>
          </div>
        )}

        {onSaveAs && (
          <section className="share-section">
            <h3 className="share-section-title">Save as a file</h3>
            <div className="share-format-row">
              {SHARE_FILE_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="small-btn share-format-btn"
                  onClick={() => onSaveAs(f.id)}
                  title={`Save as ${f.ext}`}
                >
                  {f.label}
                  <span className="share-format-ext">{f.ext}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="share-section">
          <h3 className="share-section-title">Post it somewhere</h3>
          <div className="share-format-row">
            {POST_SITES.map((site) => (
              <button
                key={site.id}
                type="button"
                className="small-btn share-post-btn"
                onClick={() => void handlePostTo(site)}
              >
                {site.label} ↗
              </button>
            ))}
          </div>
          <p className="share-desc muted small">
            {postedNotice ?? "These sites have no way to post from another app, so the poem is copied for you and the site opens in a new tab — paste it there."}
          </p>
        </section>

        {onCopyToDrafts && (
          <div className="share-actions">
            <button type="button" className="small-btn small-btn-primary" onClick={onCopyToDrafts}>
              Save to my drafts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ViewSharedPoemProps {
  poem: SharedPoem;
  onDismiss: () => void;
  onAddToDrafts: () => void;
}

export function ViewSharedPoem({ poem, onDismiss, onAddToDrafts }: ViewSharedPoemProps) {
  return (
    <div className="share-overlay" role="dialog" aria-modal aria-label="Shared poem">
      <div className="share-modal share-modal-view">
        <div className="share-modal-head">
          <span className="share-modal-badge">Shared poem</span>
          <button type="button" className="share-close-btn" onClick={onDismiss} aria-label="Close">✕</button>
        </div>
        {poem.title && <h2 className="share-view-title">{poem.title}</h2>}
        <pre className="share-view-body">{poem.body}</pre>
        <div className="share-actions">
          <button type="button" className="small-btn" onClick={onDismiss}>Dismiss</button>
          <button type="button" className="small-btn small-btn-primary" onClick={onAddToDrafts}>
            Save to my drafts
          </button>
        </div>
      </div>
    </div>
  );
}
