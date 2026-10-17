import { expect, test } from "@playwright/test";
import { clickDemo, fast, openTask, startFlow, viewAs, exitGuide, endShot } from "./helpers";

// D2 Close a gap with a new control: Choose a fix, the design checks stop at D6, Priya answers,
// Anthony signs off, CTL-153 goes into force, the MFA obligation is covered, 3 vendor reviews exist.
test("D2 · Close a gap with a new control", async ({ page }) => {
  await startFlow(page, "D2");
  await exitGuide(page);
  await expect(page).toHaveURL(/\/rules\/RC-2026-011\//);
  const strip = page.getByRole("region", { name: "Four answers" });
  await expect(strip).toContainText("Priya Raman");
  // 2 Choose a fix: the control design plays in place
  await clickDemo(page, "D2-2");
  await fast(page);
  // 3 D6 stops at "can't tell": a handoff to Priya is created
  await expect(page.getByText("Waiting on Priya Raman").first()).toBeVisible({ timeout: 120_000 });
  // 4 Priya answers
  await viewAs(page, "Priya Raman");
  await openTask(page, "D2-4");
  const drawer = page.getByRole("dialog").last();
  await drawer.getByRole("radio", { name: "Yes, but it is vaulted and needs two officers" }).click();
  await drawer.locator('[data-demo~="D2-4"]').click();
  // 5 Anthony signs off
  await viewAs(page, "Anthony Marsh");
  await openTask(page, "D2-5");
  const d2 = page.getByRole("dialog").last();
  await d2.getByRole("radio", { name: "Approve", exact: true }).click();
  await d2.locator('[data-demo~="D2-5"]').click();
  await expect(page.getByText("CTL-153 is in force").first()).toBeVisible();
  // 6 back as Elena: the MFA obligation is covered and CTL-153 stands behind it
  await viewAs(page, "Elena Petrova");
  await page.goto("/obligations/D-208-M1/", { waitUntil: "networkidle" });
  await expect(page.locator("main, body").getByText("Covered").first()).toBeVisible();
  await page.getByRole("radio", { name: "Chain" }).click();
  await expect(page.getByText(/CTL-153/).first()).toBeVisible();
  // end: 3 vendor reviews for Nadia Brennan, and a retest
  await viewAs(page, "Nadia Brennan");
  await page.goto("/tasks/", { waitUntil: "networkidle" });
  await expect(page.getByText(/for phishing-resistant MFA/)).toHaveCount(3);
  await endShot(page, "D2");
});
