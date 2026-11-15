import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Accessibility regression for components/ui (PR #11 review): every component state shown
// on /dev/ui, including selected tabs/toggles and the current step, must pass WCAG 2.2 AA.
test("dev UI kit has no WCAG AA violations", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
  expect(summary).toEqual([]);
});
