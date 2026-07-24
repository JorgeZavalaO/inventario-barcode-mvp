import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Login
  console.log("Login...");
  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', "admin@stockscan.app");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("http://localhost:3000/", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  console.log("  Login exitoso");

  // PASO 1: Dashboard
  console.log("PASO 1: Dashboard");
  await page.screenshot({ path: "e2e/screenshots/01-dashboard.png", fullPage: true });

  // PASO 2: Productos
  console.log("PASO 2: Productos");
  await page.goto("http://localhost:3000/products");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "e2e/screenshots/02-products.png", fullPage: true });

  // PASO 3: Ubicaciones
  console.log("PASO 3: Ubicaciones");
  await page.goto("http://localhost:3000/locations");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "e2e/screenshots/03-locations.png", fullPage: true });

  // PASO 4: Rack detail - buscar enlace al rack
  console.log("PASO 4: Rack detail");
  const rackLink = page.locator('a[href*="/locations/racks/"]').first();
  if (await rackLink.count() > 0) {
    await rackLink.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/04-rack-detail.png", fullPage: true });
  } else {
    console.log("  No se encontró enlace al rack");
  }

  // PASO 5: Nueva sesión V2
  console.log("PASO 5: Nueva sesión V2");
  await page.goto("http://localhost:3000/sessions/v2/new");
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder*="Inventario"]', "Demo Sesión");
  await page.screenshot({ path: "e2e/screenshots/05-new-session.png", fullPage: true });

  // PASO 6: Crear sesión y entrar al scan
  console.log("PASO 6: Creando sesión...");
  await page.locator("button", { hasText: "Todo el almacén" }).click();
  await page.locator("button", { hasText: /Crear sesión/ }).click();
  await page.waitForURL("**/scan", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  
  // Esperar a que carguen los imports
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "e2e/screenshots/06-scan-identify.png", fullPage: true });

  // PASO 7: Seleccionar importación
  console.log("PASO 7: Seleccionando importación");
  const importSelect = page.locator("select").first();
  await importSelect.waitFor({ state: "visible", timeout: 10000 });
  const options = await importSelect.locator("option").allTextContents();
  console.log(`  Opciones: ${options.join(", ")}`);
  
  if (options.length > 1) {
    await importSelect.selectOption({ index: 1 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/07-import-selected.png", fullPage: true });
    console.log("  Importación seleccionada");

    // PASO 8: Seleccionar pallet
    console.log("PASO 8: Seleccionando pallet");
    const palletSelect = page.locator("select").nth(1);
    await palletSelect.waitFor({ state: "visible", timeout: 5000 });
    const palletOptions = await palletSelect.locator("option").allTextContents();
    console.log(`  Opciones pallet: ${palletOptions.join(", ")}`);
    
    if (palletOptions.length > 1) {
      await palletSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "e2e/screenshots/08-pallet-selected.png", fullPage: true });
      console.log("  Pallet seleccionado");

      // PASO 9: Seleccionar caja
      console.log("PASO 9: Seleccionando caja");
      const boxSelect = page.locator("select").nth(2);
      await boxSelect.waitFor({ state: "visible", timeout: 5000 });
      const boxOptions = await boxSelect.locator("option").allTextContents();
      console.log(`  Opciones caja: ${boxOptions.join(", ")}`);
      
      if (boxOptions.length > 1) {
        await boxSelect.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: "e2e/screenshots/09-box-selected.png", fullPage: true });
        console.log("  Caja seleccionada");
      }
    }
  }

  console.log("\nScreenshots guardados en e2e/screenshots/");
  await browser.close();
}

main().catch(console.error);
