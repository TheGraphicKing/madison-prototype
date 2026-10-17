import { expect, type Page } from "@playwright/test";

/** Every story starts on Today, as its person: a fresh tab is a fresh demo. */
export async function startFlow(page: Page, id: string) {
  // THEME=graphite-dark (or harbor-light) runs the flow in that palette and mode
  const theme = process.env.THEME;
  if (theme)
    await page.addInitScript((t) => {
      const [p, m] = t.split("-");
      localStorage.setItem("mad_palette", p);
      localStorage.setItem("mad_mode", m || "light");
    }, theme);
  await page.goto("/", { waitUntil: "networkidle" });
  const persona = id === "D5" ? "Anthony Marsh" : "Elena Petrova";
  if (persona !== "Elena Petrova") await viewAs(page, persona);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(persona.split(" ")[0]);
}

/** Switch persona through the "Viewing as" menu in the header. */
export async function viewAs(page: Page, name: string) {
  // close the task drawer first: while it is open the rest of the page is inert
  for (let i = 0; i < 2 && (await page.locator('[role="dialog"][data-open], [role="dialog"]:not([aria-label="Demo guide"])').count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: /^Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name: new RegExp(name) }).or(page.getByRole("option", { name: new RegExp(name) })).first().click();
  await expect(page.getByRole("button", { name: new RegExp(`Viewing as ${name}`) })).toBeVisible();
}

/** Scene labels drift with the camera, so clicks on them skip the stability wait. */
export async function clickDemo(page: Page, key: string) {
  const el = page.locator(`[data-demo~="${key}"]`).filter({ visible: true }).first();
  await el.waitFor({ state: "visible" });
  try {
    await el.click({ timeout: 4000 });
  } catch {
    await el.scrollIntoViewIfNeeded();
    await el.click({ force: true });
  }
}

export async function fast(page: Page) {
  const r = page.getByRole("radio", { name: "4×" });
  await r.first().waitFor();
  await r.first().click();
}

/** Open the persona's task in the drawer from My tasks. */
export async function openTask(page: Page, demoKey: string) {
  await page.goto("/tasks/", { waitUntil: "networkidle" });
  await page.locator(`li[data-demo~="${demoKey}"] [role="button"]`).first().click();
  await expect(page.getByRole("dialog").last()).toBeVisible();
}

/** The guide's Next: waits until the step's action has happened, then moves on. */
export async function advance(page: Page) {
  const guide = page.getByRole("dialog", { name: "Demo guide" });
  const next = guide.getByRole("button", { name: /^(Next|Finish)$/ });
  await expect(next).toBeEnabled({ timeout: 120_000 });
  await next.click();
}

/** The guide is optional: leave it and carry on by hand. */
export async function exitGuide(page: Page) {
  await page.getByRole("dialog", { name: "Demo guide" }).getByRole("button", { name: "Exit" }).click();
  await expect(page.getByRole("dialog", { name: "Demo guide" })).toHaveCount(0);
}

/** With SHOTS set, the flow's ending is saved for the docs. */
export async function endShot(page: Page, id: string) {
  if (!process.env.SHOTS) return;
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `docs/iteration-3/flows/${id}-end-${process.env.THEME ?? "graphite-light"}-1440.png` });
}
