/**
 * Debounce shared by the editor spell decorations and the workshop heavy-body
 * sync so the sidebar list matches what the editor highlights.
 */
export const SPELL_ANALYSIS_DEBOUNCE_MS = 320;

/**
 * How long to wait before pushing poem body from the CodeMirror buffer into React.
 * Keeps the workshop shell from re-rendering on every keystroke while typing fast.
 */
export const BODY_TO_REACT_DEBOUNCE_MS = 100;
