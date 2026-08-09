import { test, expect, type Page } from "@playwright/test";

/**
 * Two "Open library" controls are visible at once on desktop — the rail button
 * and a ghost button in the topbar's privacy actions — so a bare attribute
 * selector trips Playwright's strict mode. Go through the rail, which is the
 * primary control.
 */
function openLibrary(page: Page) {
  return page.locator(".rail-btn-library").click();
}

/**
 * Backup lives in the Export modal, not the library drawer — these tests used to
 * open the library and click a "Backup" tab that no longer exists there. Driving
 * it through the command palette keeps the test off whichever button happens to
 * be showing in the rail or topbar.
 */
async function openExportModal(page: Page) {
  // Drop focus out of CodeMirror first — its own keymap takes Ctrl+K, so the
  // palette never opens if the caret is still in the poem.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Control+k");
  // Wait for each step rather than assuming it landed: typing into the search box
  // before the palette has mounted loses the query, and Enter then runs whatever
  // the unfiltered list had highlighted instead of the export command.
  await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
  await page.getByRole("textbox", { name: /command search/i }).fill("Open Export");
  // Click the row rather than pressing Enter: Enter acts on whichever row the
  // palette has highlighted, which is not reliably the filtered match.
  // .first() — the query matches both the row and its inner label element.
  const row = page.locator(".cmdk").getByText("Open Export").first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("dialog", { name: /export poem/i })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    // Avoid the first-visit banner covering controls in headless runs
    localStorage.setItem("easy-poems:first-hint-dismissed", "1");
    // Skip the landing page. Without this, localStorage.clear() above resets the
    // app to a first-time visitor and every test below lands on the marketing
    // page instead of the workshop — which is exactly why they were all failing
    // on `.poem-cm-wrap` not existing.
    localStorage.setItem("easy-poems:landing-dismissed", "1");
    localStorage.setItem("easy-poems:sample-dismissed", "1");
  });
  await page.reload();
  // Gate on the editor being mounted rather than letting each test race the
  // lazy workshop chunk.
  await page.locator(".cm-content").waitFor({ state: "visible", timeout: 15000 });
});

test("loads and shows the editor", async ({ page }) => {
  await expect(page.locator(".poem-cm-wrap")).toBeVisible();
});

test("creates a new draft", async ({ page }) => {
  await openLibrary(page);
  await page.locator(".drawer").getByRole("button", { name: "New draft" }).click();
  // Library closes after creating new draft
  await expect(page.locator(".drawer")).not.toBeVisible();
});

test("types into the editor", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("Shall I compare thee to a summer's day?");
  await expect(page.locator(".topbar-context-stat").first()).toContainText(/\d/);
});

test("title field updates", async ({ page }) => {
  const titleInput = page.locator("#poem-title");
  await titleInput.fill("My Test Poem");
  await expect(titleInput).toHaveValue("My Test Poem");
});

// Was "saved flash appears after editing", asserting on `.save-dot.is-on`. No
// such element exists anywhere in the app any more — the indicator was removed,
// so the test could only ever fail. Assert the behaviour it was standing in for
// instead: that edits are actually persisted and survive a reload.
test("edits are autosaved and survive a reload", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("Testing autosave");
  await expect(editor).toContainText("Testing autosave");

  await page.waitForTimeout(600); // let the debounced write land
  await page.reload();
  await page.locator(".cm-content").waitFor({ state: "visible", timeout: 15000 });
  await expect(page.locator(".cm-content")).toContainText("Testing autosave");
});

test("library drawer opens and closes", async ({ page }) => {
  await openLibrary(page);
  await expect(page.locator('[role="dialog"][aria-label="Draft library"]')).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});

test("library drawer closes when clicking overlay", async ({ page }) => {
  await openLibrary(page);
  await expect(page.locator(".overlay")).toBeVisible();
  // Click on the overlay backdrop (not the drawer)
  await page.locator(".overlay").click({ position: { x: 10, y: 10 } });
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});

test("export backup downloads a file", async ({ page }) => {
  // Type some content so there's something to export
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("A poem to export");

  await openExportModal(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export backup.*json/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/easy-poems-backup.*\.json$/);
});

test("import backup restores poems", async ({ page }) => {
  // Build a minimal valid backup JSON
  const backup = JSON.stringify({
    easyPoemsWorkshopExport: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    poems: [
      {
        title: "Imported Poem",
        body: "Roses are red",
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  await openExportModal(page);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /import backup/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });

  // Import notice should appear
  await expect(page.locator(".import-notice-banner")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(".import-notice-text")).toContainText("Imported 1 poem");
});

test("import rejects invalid version backup", async ({ page }) => {
  const badBackup = JSON.stringify({
    easyPoemsWorkshopExport: true,
    version: 99,
    exportedAt: new Date().toISOString(),
    poems: [],
  });

  await openExportModal(page);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /import backup/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(badBackup),
  });

  await expect(page.locator(".import-notice-banner")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(".import-notice-text")).toContainText("incompatible version");
});

test("spell check flags unknown word", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  // Type a clearly misspelled word
  await page.keyboard.type("zxqwerty");

  // Switch to spell check tab
  await page.getByRole("tab", { name: /spell/i }).click();

  // Eventually a spell hit should appear (after wordlist loads and debounce)
  await expect(page.locator(".spell-hit, [class*='spell']").first()).toBeVisible({
    timeout: 5000,
  });
});

test("command palette opens with Ctrl+K", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(page.locator('[role="dialog"][aria-label*="command"], .cmdk-overlay')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cmdk-overlay")).not.toBeVisible();
});

test("find bar opens with Ctrl+F", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("Control+f");
  await expect(page.locator(".findbar")).toBeVisible();
});

// The command is called "Guide" now, and it starts the spotlight tour rather
// than opening a dialog titled "Getting started" — the old name matched nothing,
// so the palette showed "No matches." and Enter did nothing.
test("opens the Guide from the command palette", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
  await page.getByRole("textbox", { name: /command search/i }).fill("guide");
  await page.keyboard.press("Enter");
  await expect(page.locator(".spotlight-tour")).toBeVisible();
  await page.keyboard.press("Escape");
});
