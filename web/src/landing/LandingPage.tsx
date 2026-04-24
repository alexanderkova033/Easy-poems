import { useEffect, useRef, useState } from "react";
import "./LandingPage.css";

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      {/* Sticky mini-header — appears after hero scrolls out of view */}
      <header className={`landing-sticky-bar${stickyVisible ? " is-visible" : ""}`} aria-hidden={!stickyVisible}>
        <span className="landing-sticky-logo" aria-hidden>❧</span>
        <span className="landing-sticky-name">easywriting-poem</span>
        <button type="button" className="landing-btn landing-btn-primary landing-sticky-cta" onClick={onEnter}>
          Start writing
        </button>
      </header>

      {/* Hero */}
      <section className="landing-hero" ref={heroRef}>
        <div className="landing-hero-inner">
          <span className="landing-brand-name">easywriting-poem</span>
          <h1 className="landing-headline">
            Write better poems.<br />
            Enjoy the process.
          </h1>
          <p className="landing-sub">
            Real-time rhyme, rhythm, syllable, and AI feedback — directly in your editor as you type. No account needed.
          </p>
          <div className="landing-ctas">
            <button type="button" className="landing-btn landing-btn-primary" onClick={onEnter}>
              Start writing →
            </button>
            <a href="#how-it-works" className="landing-btn landing-btn-ghost">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Comic guide */}
      <section className="landing-guide" id="how-it-works">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-comics">

          <div className="landing-comic-panel">
            <div className="landing-comic-art" aria-hidden>
              <div className="lc-editor-mock">
                <div className="lc-line lc-line-1" />
                <div className="lc-line lc-line-2" />
                <div className="lc-line lc-line-3" />
                <div className="lc-cursor" />
              </div>
            </div>
            <div className="landing-comic-num">1</div>
            <div className="landing-comic-content">
              <h3 className="landing-comic-title">Type your poem</h3>
              <p className="landing-comic-desc">
                Write in the big text area. Saves automatically — no account needed.
              </p>
            </div>
          </div>

          <div className="landing-comic-arrow" aria-hidden>→</div>

          <div className="landing-comic-panel">
            <div className="landing-comic-art" aria-hidden>
              <div className="lc-bars">
                <div className="lc-bar lc-bar-green" style={{ width: "80%" }} />
                <div className="lc-bar lc-bar-yellow" style={{ width: "55%" }} />
                <div className="lc-bar lc-bar-green" style={{ width: "70%" }} />
                <div className="lc-bar lc-bar-red" style={{ width: "30%" }} />
              </div>
            </div>
            <div className="landing-comic-num">2</div>
            <div className="landing-comic-content">
              <h3 className="landing-comic-title">See live analysis</h3>
              <p className="landing-comic-desc">
                Rhyme scheme, meter, syllables — all update as you type.
              </p>
            </div>
          </div>

          <div className="landing-comic-arrow" aria-hidden>→</div>

          <div className="landing-comic-panel">
            <div className="landing-comic-art" aria-hidden>
              <div className="lc-score-ring">
                <svg viewBox="0 0 60 60" aria-hidden>
                  <circle cx="30" cy="30" r="24" fill="none"
                    stroke="currentColor" strokeOpacity="0.12" strokeWidth="5" />
                  <circle cx="30" cy="30" r="24" fill="none"
                    stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray="100 151" transform="rotate(-90 30 30)" />
                </svg>
                <span>74</span>
              </div>
            </div>
            <div className="landing-comic-num">3</div>
            <div className="landing-comic-content">
              <h3 className="landing-comic-title">Get AI feedback</h3>
              <p className="landing-comic-desc">
                Scores your poem and highlights the exact words to improve.
              </p>
            </div>
          </div>

          <div className="landing-comic-arrow" aria-hidden>→</div>

          <div className="landing-comic-panel">
            <div className="landing-comic-art" aria-hidden>
              <div className="lc-export">
                <div className="lc-export-icon">↓</div>
                <div className="lc-export-label">.docx</div>
              </div>
            </div>
            <div className="landing-comic-num">4</div>
            <div className="landing-comic-content">
              <h3 className="landing-comic-title">Export &amp; share</h3>
              <p className="landing-comic-desc">
                Download as .txt or .docx, or use Reading Mode for a clean view.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* What we analyze */}
      <section className="landing-concepts">
        <h2 className="landing-section-title">What easywriting-poem analyzes</h2>
        <div className="landing-concepts-grid">
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>♪</span>
            <h3>Rhyme</h3>
            <p>End-rhyme scheme labeled A B A B — see the pattern at a glance and find near-rhymes.</p>
          </div>
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>◦ ◦ •</span>
            <h3>Rhythm &amp; meter</h3>
            <p>Syllable counts per line. Stress patterns detected so you can feel where the beat falls.</p>
          </div>
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>↺</span>
            <h3>Repetition</h3>
            <p>Repeated words highlighted so you can decide whether they're intentional or just filler.</p>
          </div>
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>✦</span>
            <h3>AI score</h3>
            <p>Imagery, musicality, originality, and clarity scored 1–100 with line-level suggestions.</p>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="landing-footer-cta">
        <p className="landing-footer-tagline">
          Whether you're writing a birthday poem or a Shakespearean sonnet — easywriting-poem makes the craft more approachable.
        </p>
        <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={onEnter}>
          Open the workshop →
        </button>
      </section>
    </div>
  );
}
