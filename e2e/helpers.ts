import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ adminPage: any }>({
  adminPage: async ({ page }, use) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="email"]', "admin@stockscan.app");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("http://localhost:3000/", { timeout: 30_000 });
    await use(page);
  },
});

export { expect };
