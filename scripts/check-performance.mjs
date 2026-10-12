import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.VANTOR_PLAYWRIGHT_PATH || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
await mkdir(".tools", { recursive: true });
try {
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto("http://localhost:5174");
  await staticPage.locator("h1").waitFor({ state: "visible" });
  if (await staticPage.locator('link[rel="stylesheet"]').count()) throw new Error("Production CSS still blocks rendering");
  await staticPage.close();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(() => {
      window.performanceEntries = { lcp: [], longtask: [], shifts: [] };
      for (const [type, key] of [["largest-contentful-paint", "lcp"], ["longtask", "longtask"], ["layout-shift", "shifts"]]) {
        new PerformanceObserver(list => window.performanceEntries[key].push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration, value: entry.value, input: entry.hadRecentInput })))).observe({ type, buffered: true });
      }
    });
    await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
    await page.screenshot({ path: `.tools/hero-${viewport.width}.png` });
    const metrics = await page.evaluate(() => ({
      paints: performance.getEntriesByType("paint").map(entry => ({ name: entry.name, time: entry.startTime })),
      ...window.performanceEntries,
      remoteFonts: performance.getEntriesByType("resource").filter(entry => /fonts\.google/.test(entry.name)).length,
      headingVisible: getComputedStyle(document.querySelector(".hero-intro")).opacity,
    }));
    await page.locator("#collection").evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 100));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `.tools/collection-${viewport.width}.png` });
    const images = await page.locator(".vehicle-card img").evaluateAll(elements => elements.map(image => ({ src: image.currentSrc, width: image.clientWidth, loaded: image.complete && image.naturalWidth > 0, visible: image.getBoundingClientRect().top < window.innerHeight && image.getBoundingClientRect().bottom > 0 })));
    await page.locator(".vehicle-card .card-window").first().click();
    await page.locator("dialog[open]").waitFor();
    await page.getByRole("button", { name: "Close vehicle details" }).click();
    // Validate timing, not just that triggers exist: headings must still be moving on entry.
    for (const heading of await page.locator("[data-motion-heading]").all()) {
      await heading.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - innerHeight * 0.85));
      await page.waitForTimeout(700);
      const early = await heading.locator(".motion-heading-line").first().evaluate(element => element.style.transform);
      await heading.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - innerHeight * 0.35));
      await page.waitForTimeout(700);
      const late = await heading.locator(".motion-heading-line").first().evaluate(element => element.style.transform);
      if (early === late) throw new Error("A heading finished animating before it entered the viewport");
      await heading.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - innerHeight * 0.85));
      await page.waitForTimeout(700);
      const reversed = await heading.locator(".motion-heading-line").first().evaluate(element => element.style.transform);
      if (reversed === late) throw new Error("Heading reverse scrolling failed");
    }
    console.log(JSON.stringify({ viewport, metrics, images, errors }));
    if (errors.length || images.some(image => image.visible && !image.loaded) || metrics.remoteFonts) throw new Error("Browser verification failed");
    await page.close();
  }
  const reduced = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const reducedErrors = [];
  reduced.on("pageerror", error => reducedErrors.push(error.message));
  await reduced.goto("http://localhost:5174", { waitUntil: "networkidle" });
  if (await reduced.locator("video").count() || reducedErrors.length) throw new Error("Reduced-motion hydration failed");
  await reduced.locator("#collection").evaluate(element => element.scrollIntoView());
  await reduced.waitForTimeout(500);
  const source = await reduced.locator(".vehicle-card img").first().evaluate(image => image.currentSrc);
  if (!source.endsWith("gt3-800.webp")) throw new Error("High-density mobile did not select the expected responsive image");
  console.log("Pre-render without JavaScript, reduced-motion hydration, and 2x mobile responsive images passed.");
  await reduced.close();
} finally {
  await browser.close();
}
