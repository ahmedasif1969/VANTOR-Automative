import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

test("a fresh Strict Mode mount installs real GSAP triggers and keeps them after React updates", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost:5173/",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const originals = new Map();
  const expose = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  };
  const { window } = dom;
  let resolveFonts;
  window.document.fonts = {
    ready: new Promise((resolve) => {
      resolveFonts = resolve;
    }),
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLMediaElement.prototype.pause = function () {};
  window.matchMedia = (query) => ({
    media: query,
    matches:
      !query.includes("reduce)") &&
      !query.includes("portrait") &&
      !query.includes("max-width"),
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  window.scrollTo = (x, y) => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: typeof x === "object" ? (x.top ?? 0) : (y ?? 0),
    });
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      value: window.scrollY,
    });
  };
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
  for (const name of [
    "window",
    "document",
    "navigator",
    "Window",
    "HTMLElement",
    "Element",
    "Node",
    "history",
  ])
    expose(name, name === "window" ? window : window[name]);
  expose("getComputedStyle", window.getComputedStyle.bind(window));
  expose("requestAnimationFrame", window.requestAnimationFrame.bind(window));
  expose("cancelAnimationFrame", window.cancelAnimationFrame.bind(window));
  expose("ResizeObserver", ResizeObserver);
  expose("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(window.document.documentElement, "scrollHeight", {
    value: 16000,
    configurable: true,
  });
  Object.defineProperty(window.document.body, "scrollHeight", {
    value: 16000,
    configurable: true,
  });
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const section = this.closest("section");
    const ids = [
      "top",
      "featured",
      "statement",
      "collection",
      "story",
      "experience",
      "contact",
    ];
    const index = Math.max(0, ids.indexOf(section?.id));
    const top = index * 1800 - window.scrollY;
    return {
      top,
      bottom: top + 600,
      left: 0,
      right: 1000,
      width: 1000,
      height: 600,
      x: 0,
      y: top,
      toJSON() {},
    };
  };
  const require = createRequire(import.meta.url);
  let root, gsap, ScrollTrigger, React;
  try {
    const result = await build({
      stdin: {
        contents:
          'export { default as App } from "./src/App"; export { default as gsap } from "gsap"; export { ScrollTrigger } from "gsap/ScrollTrigger";',
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      jsx: "automatic",
      mainFields: ["module", "main"],
      plugins: [
        {
          name: "shared-react",
          setup(builder) {
            builder.onResolve({ filter: /^react(\/.*)?$/ }, (args) => ({
              path: pathToFileURL(require.resolve(args.path)).href,
              external: true,
            }));
          },
        },
      ],
    });
    const runtime = await import(
      `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text + "\n//# sourceURL=vantor-motion-test-runtime.mjs").toString("base64")}`
    );
    ({ gsap, ScrollTrigger } = runtime);
    React = await import("react");
    const { createRoot } = await import("react-dom/client");
    root = createRoot(document.getElementById("root"));
    await React.act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(runtime.App),
        ),
      );
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    const triggers = ScrollTrigger.getAll();
    assert.ok(
      triggers.length > 30,
      `Expected page motion after a fresh mount, got ${triggers.length} triggers`,
    );
    const heading = triggers.find((trigger) =>
      trigger.trigger?.hasAttribute("data-motion-heading"),
    );
    assert.ok(heading, "Fresh mount must install masked heading motion");
    assert.ok(
      gsap.getProperty(
        document.querySelector(".motion-heading-line"),
        "yPercent",
      ) > 90,
    );
    const heroTrigger = ScrollTrigger.getAll().find((trigger) => trigger.trigger?.id === "top");
    assert.ok(heroTrigger, "Hero scrubbing must initialize before media loads");
    assert.ok(!heroTrigger.pin, "CSS sticky must reserve the hero layout without a late JavaScript pin");
    await React.act(async () => {
      const video = document.querySelector("video");
      Object.defineProperty(video, "duration", {
        configurable: true,
        value: 5.17,
      });
      video.dispatchEvent(
        new window.Event("loadedmetadata", { bubbles: true }),
      );
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    assert.ok(
      ScrollTrigger.getAll().some((trigger) => trigger.trigger?.id === "top"),
      "Metadata must preserve hero scrubbing",
    );
    assert.equal(ScrollTrigger.getAll().find((trigger) => trigger.trigger?.id === "top"), heroTrigger,
      "Video readiness must not recreate hero scrubbing or repaint the opening layout");
    ScrollTrigger.refresh();
    assert.ok(
      ScrollTrigger.getAll().some((trigger) =>
        trigger.trigger?.hasAttribute("data-motion-heading"),
      ),
      "Hero metadata must not remove lower-page motion",
    );
    const rebuiltHeading = ScrollTrigger.getAll().find((trigger) =>
      trigger.trigger?.hasAttribute("data-motion-heading"),
    );
    assert.equal(
      rebuiltHeading,
      heading,
      "Hero pin readiness must refresh positions without rebuilding triggers",
    );
    await React.act(async () => {
      resolveFonts();
    });
    const settledHeading = ScrollTrigger.getAll().find((trigger) =>
      trigger.trigger?.hasAttribute("data-motion-heading"),
    );
    assert.equal(
      settledHeading,
      rebuiltHeading,
      "Font readiness must preserve existing triggers",
    );
    const line = settledHeading.trigger.querySelector(".motion-heading-line");
    const scrollHeading = (fraction) => {
      window.scrollTo(
        0,
        settledHeading.start +
          (settledHeading.end - settledHeading.start) * fraction,
      );
      document.dispatchEvent(new window.Event("scroll"));
      ScrollTrigger.update(true);
      settledHeading.getTween()?.progress(1);
    };
    scrollHeading(0.7);
    assert.ok(
      settledHeading.progress > 0.6,
      "Native scrolling must advance a lower-page trigger",
    );
    const forwardY = Number(gsap.getProperty(line, "yPercent"));
    scrollHeading(0.1);
    assert.ok(
      settledHeading.progress < 0.2,
      "Native reverse scrolling must reverse its trigger",
    );
    assert.ok(
      Number(gsap.getProperty(line, "yPercent")) > forwardY,
      "Heading transform must respond in both directions",
    );
    const featuredWindow = ScrollTrigger.getAll().find(
      (trigger) =>
        trigger.trigger?.classList.contains("featured-window") &&
        trigger.vars.end === "top 35%",
    );
    assert.ok(
      featuredWindow?.vars.scrub,
      "Featured image must reveal when the image itself arrives",
    );
    const spec = ScrollTrigger.getAll().find(
      (trigger) =>
        trigger.trigger?.classList.contains("featured-spec") &&
        trigger.vars.end === "top 55%",
    );
    assert.ok(spec?.vars.scrub, "Spec labels must not finish while offscreen");
    const discovery = ScrollTrigger.getAll().filter(
      (trigger) => trigger.trigger?.id === "drive-recommendation",
    );
    assert.ok(
      discovery.length >= 2,
      "Initial discovery wipe and mask must both be scroll-driven",
    );
    // Native preference selection rerenders App through controlled enquiry interest.
    await React.act(async () => {
      document.querySelector(".vehicle-card > button:last-child").click();
    });
    assert.ok(
      ScrollTrigger.getAll().length > 30,
      "App rerenders must not remove page animation",
    );
    await React.act(async () => root.unmount());
    root = null;
    assert.equal(
      ScrollTrigger.getAll().length,
      0,
      "Unmount must clean up every trigger",
    );
  } catch (error) {
    throw new Error("DOM motion startup regression: " + error.message);
  } finally {
    if (root) await React.act(async () => root.unmount());
    ScrollTrigger?.killAll();
    ScrollTrigger?.disable();
    gsap?.ticker.sleep();
    dom.window.close();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
