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
    await page.waitForFunction(() => getComputedStyle(document.querySelector("canvas")).opacity === "1");
    await page.screenshot({ path: `.tools/hero-${viewport.width}.png` });
    const metrics = await page.evaluate(() => ({
      paints: performance.getEntriesByType("paint").map(entry => ({ name: entry.name, time: entry.startTime })),
      ...window.performanceEntries,
      remoteFonts: performance.getEntriesByType("resource").filter(entry => /fonts\.google/.test(entry.name)).length,
      headingVisible: getComputedStyle(document.querySelector(".hero-intro")).opacity,
      initialFrames: performance.getEntriesByType("resource").filter(entry => entry.name.includes("/hero-frames/")).length,
      initialVideo: performance.getEntriesByType("resource").some(entry => entry.name.includes("vantor-hero.mp4")),
    }));
    if (metrics.initialFrames > 6 || metrics.initialVideo) throw new Error("Hero media exceeds the opening buffer budget");
    const canvasHash = () => {
      const canvas = document.querySelector("canvas");
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      window.heroOpeningPixels ??= data.slice();
      let hash = 0;
      for (let index = 0; index < data.length; index += 128) hash = (hash * 31 + data[index]) >>> 0;
      return hash;
    };
    const openingFrame = await page.evaluate(canvasHash);
    await page.evaluate(() => window.scrollTo(0, innerHeight * 0.65));
    await page.waitForTimeout(1500);
    if (await page.evaluate(canvasHash) === openingFrame) throw new Error("Hero canvas does not scrub forward");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => {
      const canvas = document.querySelector("canvas");
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const opening = window.heroOpeningPixels;
      if (data.length !== opening.length) return false;
      let difference = 0;
      for (let index = 0; index < data.length; index++) difference += Math.abs(data[index] - opening[index]);
      // GPU and CPU resampling can differ by a fraction of one color level.
      return difference / data.length < 1;
    }, undefined, { timeout: 5000 });
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
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => { window.createImageBitmap = undefined; });
  await fallback.goto("http://localhost:5174", { waitUntil: "domcontentloaded" });
  await fallback.locator("video").waitFor();
  await fallback.waitForFunction(() => Number.isFinite(document.querySelector("video").duration));
  await fallback.evaluate(() => window.scrollTo(0, 600));
  await fallback.waitForFunction(() => document.querySelector("video").currentTime > 0.5);
  console.log("On-demand fallback video scrubbing passed.");
  await fallback.close();
} finally {
  await browser.close();
}
