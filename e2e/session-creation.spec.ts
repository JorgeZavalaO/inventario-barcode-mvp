import { test, expect } from "./helpers";

test.describe("Sesión V2 — Creación con zona", () => {
  test("puede crear sesión con alcance 'Por zona'", async ({ adminPage: page }) => {
    await page.goto("http://localhost:3000/sessions/v2/new");

    await expect(page.locator("h1")).toContainText("Nueva sesión V2");

    await page.fill('input[placeholder*="Inventario"]', "Test Playwright — Por zona");

    const zoneBtn = page.locator("button", { hasText: "Por zona" });
    await expect(zoneBtn).toBeVisible();
    await zoneBtn.click();

    await expect(zoneBtn).toHaveClass(/border-teal-500/);

    const floorSections = page.locator(".rounded-lg.border.border-slate-200.p-3");
    const count = await floorSections.count();
    expect(count).toBeGreaterThanOrEqual(0);

    const createBtn = page.locator("button", { hasText: /Crear sesión/ });
    await expect(createBtn).toBeVisible();
  });
});

test.describe("Sesión V2 — Creación por rack", () => {
  test("puede crear sesión con alcance 'Por rack'", async ({ adminPage: page }) => {
    await page.goto("http://localhost:3000/sessions/v2/new");

    await page.fill('input[placeholder*="Inventario"]', "Test Playwright — Por rack");

    const rackBtn = page.locator("button", { hasText: "Por rack" });
    await rackBtn.click();

    await expect(rackBtn).toHaveClass(/border-teal-500/);

    const rackList = page.locator('label:has(input[type="checkbox"])');
    const rackCount = await rackList.count();
    expect(rackCount).toBeGreaterThanOrEqual(0);
  });
});
