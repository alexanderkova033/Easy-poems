import "./TemplatesModal.css";
import { useState } from "react";
interface Template {
  id: string;
  name: string;
  form: string;
  hint: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: "haiku",
    name: "Haiku",
    form: "Haiku (5–7–5)",
    hint: "Three lines: 5 syllables, 7 syllables, 5 syllables. A seasonal image or moment.",
    body: "Old silent pond—\na frog jumps into the pond.\nSplash! Silence again.\n",
  },
  {
    id: "sonnet-shakespearean",
    name: "Shakespearean Sonnet",
    form: "Sonnet (ABAB CDCD EFEF GG)",
    hint: "14 lines of iambic pentameter (10 syllables). Three quatrains and a couplet.",
    body:
      "Shall I compare thee to a summer's day?\n" +
      "Thou art more lovely and more temperate:\n" +
      "Rough winds do shake the darling buds of May,\n" +
      "And summer's lease hath all too short a date:\n" +
      "\n" +
      "Sometime too hot the eye of heaven shines,\n" +
      "And often is his gold complexion dimm'd;\n" +
      "And every fair from fair sometime declines,\n" +
      "By chance, or nature's changing course untrimm'd;\n" +
      "\n" +
      "But thy eternal summer shall not fade,\n" +
      "Nor lose possession of that fair thou ow'st,\n" +
      "Nor shall death brag thou wand'rest in his shade,\n" +
      "When in eternal lines to time thou grow'st:\n" +
      "\n" +
      "So long as men can breathe, or eyes can see,\n" +
      "So long lives this, and this gives life to thee.\n",
  },
  {
    id: "villanelle",
    name: "Villanelle",
    form: "Villanelle (ABA ABA ABA ABA ABA ABAA)",
    hint: "19 lines. Two refrains (A1 and A2) alternate at stanza ends, then join at the close.",
    body:
      "Do not go gentle into that good night,\n" +
      "Old age should burn and rave at close of day;\n" +
      "Rage, rage against the dying of the light.\n" +
      "\n" +
      "Though wise men at their end know dark is right,\n" +
      "Because their words had forked no lightning they\n" +
      "Do not go gentle into that good night.\n" +
      "\n" +
      "Good men, the last wave by, crying how bright\n" +
      "Their frail deeds might have danced in a green bay,\n" +
      "Rage, rage against the dying of the light.\n" +
      "\n" +
      "Wild men who caught and sang the sun in flight,\n" +
      "And learn, too late, they grieved it on its way,\n" +
      "Do not go gentle into that good night.\n" +
      "\n" +
      "Grave men, near death, who see with blinding sight\n" +
      "Blind eyes could blaze like meteors and be gay,\n" +
      "Rage, rage against the dying of the light.\n" +
      "\n" +
      "And you, my father, there on the sad height,\n" +
      "Curse, bless, me now with your fierce tears, I pray.\n" +
      "Do not go gentle into that good night.\n" +
      "Rage, rage against the dying of the light.\n",
  },
  {
    id: "limerick",
    name: "Limerick",
    form: "Limerick (AABBA)",
    hint: "5 lines. Lines 1, 2, 5 rhyme (A); lines 3, 4 rhyme (B). Anapestic meter.",
    body:
      "There once was a man from Nantucket\n" +
      "Who kept all his cash in a bucket.\n" +
      "    But his daughter, named Nan,\n" +
      "    Ran away with a man\n" +
      "And as for the bucket, Nantucket.\n",
  },
  {
    id: "tercets",
    name: "Tercets",
    form: "Free verse tercets",
    hint: "Stanzas of three lines. No fixed rhyme or meter — focus on breath and image.",
    body:
      "Line one of the first stanza,\n" +
      "a second line that extends it,\n" +
      "a third that closes or turns.\n" +
      "\n" +
      "Begin again here with a new image,\n" +
      "let it breathe across two lines,\n" +
      "end with something unexpected.\n" +
      "\n" +
      "The last stanza is yours to fill.\n" +
      "What hasn't been said yet?\n" +
      "Say it here.\n",
  },
  {
    id: "ghazal",
    name: "Ghazal",
    form: "Ghazal",
    hint: "Couplets ending with a repeated refrain word (radif). Final couplet names the poet.",
    body:
      "The wind carries messages I cannot read, desert.\n" +
      "My father's hands were maps I cannot heed, desert.\n" +
      "\n" +
      "Every dune I cross remembers the ocean's name, desert.\n" +
      "I remember only thirst and endless need, desert.\n" +
      "\n" +
      "The saint said: emptiness is a kind of god. I agreed, desert.\n" +
      "A camel knows more prayers than I will ever cede, desert.\n" +
      "\n" +
      "Say your name, traveller. Admit what you are freed, desert.\n" +
      "I am [your name], walking still, still in need, desert.\n",
  },
  {
    id: "blank-verse",
    name: "Blank verse",
    form: "Blank verse (unrhymed iambic pentameter)",
    hint: "Lines of ~10 syllables, iambic rhythm (da-DUM), no end rhyme.",
    body:
      "Begin with an image: a window, a door,\n" +
      "a hand laid flat upon a wooden table.\n" +
      "The light that falls is ordinary light.\n" +
      "You do not need to name it beautiful.\n" +
      "Let the line breathe. Let the pause do its work.\n" +
      "The syntax bends but does not break. Move on.\n",
  },
  {
    id: "free-verse",
    name: "Free verse starter",
    form: "Free verse",
    hint: "No fixed form. Start with an image or feeling and follow where it leads.",
    body:
      "Start here, with whatever is in front of you—\n" +
      "the cup going cold, the window's frame,\n" +
      "the particular slant of this afternoon's light.\n" +
      "\n" +
      "Don't explain. Show the thing itself.\n" +
      "Let the line break where your breath breaks.\n" +
      "\n" +
      "Resist the first ending. Go one line further.\n" +
      "That is usually where the poem begins.\n",
  },
];

function templatePreview(body: string): string {
  const lines = body.split("\n").filter((l) => l.trim().length > 0).slice(0, 3);
  return lines.join("\n");
}

export function TemplatesModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (body: string, form: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal templates-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-modal-title"
      >
        <div className="modal-head">
          <h2 id="templates-modal-title" className="modal-title">
            Poem forms
          </h2>
          <button type="button" className="small-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="modal-note">
          Inserting a template replaces your current poem body. Save a snapshot first if you want to keep it.
        </p>
        <ul className="templates-list">
          {TEMPLATES.map((t) => (
            <li
              key={t.id}
              className="template-item"
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(t.id)}
              onBlur={() => setHoveredId(null)}
            >
              <div className="template-item-info">
                <span className="template-item-name">{t.name}</span>
                <span className="template-item-form muted small">{t.form}</span>
                <span className="template-item-hint muted small">{t.hint}</span>
                {hoveredId === t.id && (
                  <pre className="template-item-preview" aria-hidden>
                    {templatePreview(t.body)}
                    {"\n…"}
                  </pre>
                )}
              </div>
              <button
                type="button"
                className="small-btn small-btn-primary"
                onClick={() => {
                  onInsert(t.body, t.form);
                  onClose();
                }}
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
