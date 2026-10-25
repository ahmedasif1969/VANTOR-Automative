import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../src/lib/useSmoothScroll.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

test("smooth scrolling owns one ticker, survives Strict Mode cleanup, and switches to native reduced motion", () => {
  const originals = new Map(
    ["window", "document", "history"].map((key) => [key, globalThis[key]]),
  );
  const tickers = new Set();
  const instances = [];
  const effects = [];
  const changes = new Set();
  const nativeScrolls = [];
  const historyChanges = [];
  const target = { scrollIntoView: (options) => nativeScrolls.push(options) };
  let modalOpen = false;
  const media = {
    matches: false,
    addEventListener: (name, callback) => changes.add(callback),
    removeEventListener: (name, callback) => changes.delete(callback),
  };
  const update = () => {};
  class MockLenis {
    constructor(options) {
      this.options = options;
      this.events = new Map();
      this.frames = [];
      this.scrolls = [];
      this.isStopped = false;
      instances.push(this);
    }
    on(name, callback) {
      this.events.set(name, callback);
    }
    off(name, callback) {
      assert.equal(this.events.get(name), callback);
      this.events.delete(name);
    }
    raf(time) {
      this.frames.push(time);
    }
    stop() {
      this.isStopped = true;
    }
    start() {
      this.isStopped = false;
    }
    scrollTo(element, options) {
      this.scrolls.push({ element, options });
    }
    destroy() {
      this.destroyed = true;
    }
  }
  const modules = {
    react: { useEffect: (effect) => effects.push(effect) },
    gsap: {
      default: {
        ticker: {
          add: (callback) => tickers.add(callback),
          remove: (callback) => tickers.delete(callback),
          lagSmoothing: () => {},
        },
      },
    },
    "gsap/ScrollTrigger": { ScrollTrigger: { update } },
    lenis: { default: MockLenis },
  };
  const exports = {};
  new Function("require", "exports", compiled)(
    (name) => modules[name],
    exports,
  );
  globalThis.window = { matchMedia: () => media };
  globalThis.document = {
    querySelector: () => (modalOpen ? {} : null),
    getElementById: (id) => (id === "contact" ? target : null),
  };
  globalThis.history = {
    replaceState: (state, title, hash) => historyChanges.push(hash),
  };
  let cleanup;
  try {
    exports.setIntroLoading(true);
    exports.useSmoothScroll();
    cleanup = effects[0]();
    assert.equal(tickers.size, 1);
    assert.equal(instances[0].isStopped, true, "A visible loader stops Lenis even if it mounts first");
    tickers.values().next().value(1);
    assert.equal(instances[0].isStopped, true);
    exports.setIntroLoading(false);
    assert.equal(instances[0].isStopped, false);
    assert.equal(instances[0].events.get("scroll"), update);
    assert.equal(instances[0].options.anchors.offset, -90);
    assert.ok(
      instances[0].options.prevent({
        matches: (selector) => selector.includes("textarea"),
      }),
    );
    cleanup();
    assert.equal(tickers.size, 0);
    assert.ok(instances[0].destroyed);
    assert.equal(instances[0].events.size, 0);

    // React Strict Mode installs, cleans up, then installs the effect again.
    cleanup = effects[0]();
    assert.equal(tickers.size, 1);
    const lenis = instances[1];
    exports.setIntroLoading(true);
    assert.equal(lenis.isStopped, true);
    tickers.values().next().value(1.5);
    assert.equal(lenis.isStopped, true, "The ticker must not restart Lenis under the loader");
    exports.setIntroLoading(false);
    assert.equal(lenis.isStopped, false);
    modalOpen = true;
    tickers.values().next().value(2);
    assert.ok(lenis.isStopped);
    assert.equal(lenis.frames.at(-1), 2000);
    modalOpen = false;
    tickers.values().next().value(3);
    assert.equal(lenis.isStopped, false);
    exports.holdHeroScrollAt(1599);
    assert.deepEqual(lenis.scrolls.at(-1), {
      element: 1599,
      options: { immediate: true, force: true },
    });
    assert.equal(lenis.isStopped, true);
    tickers.values().next().value(3.5);
    assert.equal(lenis.isStopped, true, "The ticker must not restart Lenis during hero catch-up");
    exports.releaseHeroScrollHold();
    assert.equal(lenis.isStopped, false, "Playback completion releases scrolling at the hero boundary");
    exports.scrollToSection("contact");
    assert.equal(lenis.scrolls.at(-1).element, target);
    assert.equal(lenis.scrolls.at(-1).options.offset, -90);

    media.matches = true;
    changes.values().next().value();
    assert.equal(tickers.size, 0);
    assert.ok(lenis.destroyed);
    exports.scrollToSection("contact");
    assert.deepEqual(nativeScrolls, [{ behavior: "instant" }]);
    assert.deepEqual(historyChanges, ["#contact", "#contact"]);

    media.matches = false;
    changes.values().next().value();
    assert.equal(tickers.size, 1);
    assert.equal(instances.length, 3);
    cleanup();
    assert.equal(tickers.size, 0);
    assert.equal(changes.size, 0);
    assert.ok(instances.every((instance) => instance.destroyed));
  } finally {
    cleanup?.();
    for (const [key, value] of originals) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
