import type { usePoemWorkshopModel } from "./usePoemWorkshopModel";

type Model = ReturnType<typeof usePoemWorkshopModel>;

/**
 * Whether any of the model-driven banners currently wants the screen.
 *
 * Lets the shell keep the first-visit hint out of the way when something more
 * important is already showing — on a phone those two stacked together took
 * roughly 40% of the viewport.
 *
 * AiBudgetBanner is deliberately excluded: its visibility depends on internal
 * rate-limit state rather than the model, and it is both urgent and short-lived,
 * so it is allowed to appear alongside whatever else is up.
 *
 * Kept in its own module rather than beside the component so WorkshopBanners.tsx
 * exports only components (react-refresh/only-export-components).
 */
export function hasBlockingBanner(m: Model): boolean {
  return Boolean(
    m.persistenceError || m.wordlistErr || m.importNotice || m.showExportReminder || m.samplePoemActive,
  );
}
