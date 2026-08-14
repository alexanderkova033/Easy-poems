/**
 * Where a finished poem can go: file formats to save it as, and sites to post
 * it to.
 *
 * Separate from ShareModal.tsx so that file exports components only — a module
 * that exports both components and constants loses fast refresh.
 */

/** File formats the poem can be saved as, in the order they are offered. */
export const SHARE_FILE_FORMATS = [
  { id: "txt", label: "Text", ext: ".txt" },
  { id: "md", label: "Markdown", ext: ".md" },
  { id: "docx", label: "Word", ext: ".docx" },
  { id: "pdf", label: "PDF", ext: ".pdf" },
  { id: "html", label: "Web page", ext: ".html" },
  { id: "png", label: "Image", ext: ".png" },
] as const;

export type ShareFileFormat = (typeof SHARE_FILE_FORMATS)[number]["id"];

/**
 * Where poets actually post. Opened in a new tab with the poem already on the
 * clipboard: none of these have a public API to post through, so the paste is
 * the writer's, and each is reached at its own front door rather than a guessed
 * deep link that could rot.
 */
export const POST_SITES = [
  { id: "allpoetry", label: "AllPoetry", url: "https://allpoetry.com/" },
] as const;

export type PostSite = (typeof POST_SITES)[number];
