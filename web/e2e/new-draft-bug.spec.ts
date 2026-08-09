import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("easy-poems:first-hint-dismissed", "1");
    localStorage.setItem("easy-poems:sample-dismissed", "1");
    localStorage.setItem("easy-poems:landing-dismissed", "1");
  });
  await page.reload();
  await page.locator(".cm-content").waitFor({ state: "visible", timeout: 10000 });
});

test("clicking New draft clears the editor body", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("hello world from previous draft");
  await page.waitForTimeout(300);

  await page.locator('button[aria-label="New draft"]').click();
  await page.waitForTimeout(300);

  const afterText = await page.locator(".cm-content").innerText();
  expect(afterText).not.toContain("hello world from previous draft");

  const title = await page.locator("#poem-title").inputValue();
  expect(title).toBe("");
});

test("switching back to the previous draft restores its body", async ({ page }) => {
  // Every wait here is an assertion on the state the next step needs, rather than
  // a fixed sleep. The previous version slept 300/200/500ms around a debounced
  // autosave and then took a single innerText() reading with no retry, which
  // failed roughly one run in four.
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("first draft content");
  await expect(editor).toContainText("first draft content");

  await page.locator('button[aria-label="New draft"]').click();
  await expect(editor).not.toContainText("first draft content");

  await editor.click();
  await page.keyboard.type("second draft content");
  await expect(editor).toContainText("second draft content");

  // Pick the draft we are NOT currently on. The option list is sorted by
  // lastOpenedAt descending (useDraftMeta), so index 0 is the draft just opened —
  // selecting it is a no-op, because selectPoem early-returns when the id already
  // matches. Taking index 0 only appeared to work when both drafts happened to
  // share a lastOpenedAt millisecond and the tie broke the other way, which is
  // what made this test fail roughly one run in four.
  const draftSelect = page.locator('select[aria-label="Active draft"]');
  const { value: activeId, options } = await draftSelect.evaluate((el) => ({
    value: (el as HTMLSelectElement).value,
    options: [...(el as HTMLSelectElement).options].map((o) => o.value),
  }));
  const otherId = options.find((v) => v !== activeId);
  expect(otherId, "expected a second draft to switch to").toBeTruthy();
  await draftSelect.selectOption(otherId!);

  // toContainText retries until the switch has been applied.
  await expect(editor).toContainText("first draft content");
  await expect(editor).not.toContainText("second draft content");
});
