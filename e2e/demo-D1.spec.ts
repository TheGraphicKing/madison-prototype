import { expect, test } from "@playwright/test";
import { advance, clickDemo, fast, startFlow, viewAs } from "./helpers";

// D1 A new rule lands: Today, run Madison on 12 CFR 1005.11(c), accept 6 and exclude 1,
// then Coverage shows the new gap in the Reg E plot and Margaret Ellison has a task.
test("D1 · A new rule lands", async ({ page }) => {
  await startFlow(page, "D1");
  // 1 Today: the open rule change opens its change room, not started
  await clickDemo(page, "D1-1");
  await expect(page).toHaveURL(/\/rules\/RC-2026-014\//);
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Not checked yet");
  await advance(page);
  // 2 run it in place
  await clickDemo(page, "D1-2");
  await fast(page);
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await advance(page);
  // 3 the Obligations platform shows the rule's own words
  await clickDemo(page, "D1-3");
  await expect(page.getByRole("region", { name: "Obligations detail" })).toBeVisible();
  await advance(page);
  // 4 the double-check gate holds one back
  await advance(page);
  // 5 You decide
  const accept = page.locator('[data-demo~="D1-5"]');
  await accept.waitFor({ timeout: 120_000 });
  await accept.click();
  await advance(page);
  // 6 the run finishes: 4 covered, 1 not yet confirmed, 1 gap, owner named
  const strip = page.getByRole("region", { name: "Four answers" });
  await expect(strip).toContainText("4 of 6", { timeout: 120_000 });
  await expect(strip).toContainText("Margaret Ellison");
  await advance(page);
  // 7 Open in Coverage: the Reg E plot has the new gap block
  await clickDemo(page, "D1-7");
  await expect(page).toHaveURL(/\/coverage\/.*plot=reg-01/);
  const panel = page.getByRole("complementary", { name: /Regulation E.*detail|detail/ }).last();
  await expect(panel).toContainText("Provisionally credit the customer within 5 business days");
  await expect(panel).toContainText("Nothing behind it");
  // the guide ends with what changed
  await advance(page);
  await expect(page.getByRole("dialog", { name: "Demo guide" })).toContainText("Demo complete");
  // end: Margaret Ellison has a task; the record has signed entries
  await viewAs(page, "Margaret Ellison");
  await page.goto("/tasks/", { waitUntil: "networkidle" });
  await expect(page.getByText("Update POL-DISP-01 4.2 to 5 business days")).toBeVisible();
  await page.goto("/record/?view=list", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "List" }).click();
  await expect(page.getByText(/Accepted 6 obligations and excluded 1/).first()).toBeVisible();
});
