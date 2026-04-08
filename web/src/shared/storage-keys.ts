/** All localStorage/sessionStorage keys used by Easy-poems, in one place. */

// Draft library
export const STORAGE_KEY_LIBRARY = "easy-poems:library:v1";

// Single-slot draft (legacy migration path)
export const STORAGE_KEY_DRAFT = "easy-poems:draft:v2";
export const STORAGE_KEY_DRAFT_LEGACY_V1 = "easy-poems:draft:v1";

// Revision snapshots
/** Legacy global snapshot store (pre-library) */
export const STORAGE_KEY_REVISIONS_V1 = "easy-poems:revisions:v1";
/** Per-poem snapshot map */
export const STORAGE_KEY_REVISIONS_V2 = "easy-poems:revisions:v2";

// Spell check
export const STORAGE_KEY_SPELL_DICT = "easy-poems:spell:personal:v1";
export const STORAGE_KEY_SPELL_IGNORE_SESSION = "easy-poems:spell:ignore-session:v1";

// Workshop metadata
export const STORAGE_KEY_GOALS = "easy-poems:goals:v1";
export const STORAGE_KEY_LIBRARY_META = "easy-poems:libraryMeta:v1";
export const STORAGE_KEY_APPEARANCE = "easy-poems:appearance:v1";
export const STORAGE_KEY_FIRST_HINT_DISMISSED = "easy-poems:first-hint-dismissed";

// Session / UI preferences
export const STORAGE_KEY_LAST_TOOL_TAB = "easy-poems:lastToolTab";
export const STORAGE_KEY_LAST_EXPORT_AT = "easy-poems:lastExportAt";
export const STORAGE_KEY_SHOW_LINE_SYLLABLES = "easy-poems:showLineSyllables";

// AI settings
export const STORAGE_KEY_AI_MODEL = "ep_openai_model";
