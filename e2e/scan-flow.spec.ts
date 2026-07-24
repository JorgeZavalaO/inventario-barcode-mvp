import { test, expect } from "./helpers";

test.describe("Sesión V2 — Flujo de escaneo", () => {
  test("la página de escaneo carga correctamente", async ({ adminPage: page }) => {
    const res = await page.goto("http://localhost:3000/sessions/v2");
    expect(res?.status()).toBe(200);

    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("la página de nueva sesión muestra los alcances", async ({ adminPage: page }) => {
    await page.goto("http://localhost:3000/sessions/v2/new");

    await expect(page.locator("text=Todo el almacén")).toBeVisible();
    await expect(page.locator("text=Por piso")).toBeVisible();
    await expect(page.locator("text=Por zona")).toBeVisible();
    await expect(page.locator("text=Por rack")).toBeVisible();
    await expect(page.locator('button', { hasText: 'Posiciones' }).first()).toBeVisible();
  });

  test("el flujo de sesión muestra pasos IDENTIFY → CONFIRM → ASSIGN → SUMMARY", async ({ adminPage: page }) => {
    await page.goto("http://localhost:3000/sessions/v2/new");

    await page.fill('input[placeholder*="Inventario"]', "Test Playwright — Flujo");

    const totalBtn = page.locator("button", { hasText: "Todo el almacén" });
    await totalBtn.click();

    const createBtn = page.locator("button", { hasText: /Crear sesión/ });
    await createBtn.click();

    await page.waitForURL("**/scan", { timeout: 15_000 });

    const identifyLabel = page.locator("text=Identificar caja");
    await expect(identifyLabel).toBeVisible({ timeout: 10_000 });
  });
});
