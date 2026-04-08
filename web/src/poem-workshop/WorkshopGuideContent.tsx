export function WorkshopGuideContent() {
  return (
    <div className="guide-modal-content">
      <p className="guide-modal-lead">
        You do not need every control on day one. Think of the workshop as three strips:{" "}
        <strong>header</strong> (draft + quick actions), <strong>the poem</strong> in the
        middle, and <strong>tools</strong> on the right. Everything else is optional depth.
      </p>

      <section className="guide-section" aria-labelledby="guide-layout-heading">
        <h3 id="guide-layout-heading" className="guide-section-title">
          Where things live
        </h3>
        <ul className="guide-section-list">
          <li>
            <strong>Header</strong> — Draft picker, <strong>Library</strong>, counts, and
            the &quot;quick&quot; row: Commands, Find, Shortcuts. The thin icon rail repeats
            a few of those (Library, Fonts, Backdrop, Export, Focus) as one-click shortcuts.
          </li>
          <li>
            <strong>Poem</strong> — Title and body; autosaves in this browser.
          </li>
          <li>
            <strong>Tools column</strong> — Tabs for Overview (at-a-glance stats), Sound
            (meter, rhyme, repeats), Issues, Lines, and more. The colored pill strip under the
            tabs jumps straight to a specific tab.
          </li>
        </ul>
      </section>

      <section className="guide-section" aria-labelledby="guide-doubt-heading">
        <h3 id="guide-doubt-heading" className="guide-section-title">
          When you are unsure
        </h3>
        <ul className="guide-section-list">
          <li>
            Press <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>+
            <kbd className="kbd-hint">K</kbd> for <strong>Commands</strong> — search export,
            templates, reading view, focus mode, and everything else by name.
          </li>
          <li>
            Use <strong>Shortcuts</strong> in the header (or under the tool tabs) for the full
            key map.
          </li>
          <li>
            Press <kbd className="kbd-hint">Esc</kbd> to close the frontmost dialog or panel.
          </li>
          <li>
            On a mouse or trackpad, pause over many buttons for about half a second to see a
            short explanation. Turn this off under <strong>Fonts</strong> or in{" "}
            <strong>Commands</strong> (“delayed hover”) if you find it distracting.
          </li>
        </ul>
      </section>

      <section className="guide-section" aria-labelledby="guide-backup-heading">
        <h3 id="guide-backup-heading" className="guide-section-title">
          Keep your work safe
        </h3>
        <p className="guide-section-plain">
          This app saves in your browser only. Try an occasional{" "}
          <strong>Export backup (JSON)</strong> from the Library drawer or Export modal — that
          file is the easiest way to move drafts to another device or keep a safety copy.
        </p>
      </section>

      <section className="guide-section" aria-labelledby="guide-privacy-heading">
        <h3 id="guide-privacy-heading" className="guide-section-title">
          Privacy
        </h3>
        <p className="guide-section-plain">
          Drafts and settings stay in this browser until you export or copy text out — nothing
          is uploaded as part of normal editing.
        </p>
      </section>
    </div>
  );
}
