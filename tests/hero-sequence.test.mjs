import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../src/lib/heroSequence.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { HeroSequence, HERO_FRAME_COUNT, HERO_STARTUP_DOWNLOAD_FRAMES, HERO_STARTUP_DECODE_FRAMES } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("both asset sequences contain every frame from the source clip", async () => {
  for (const variant of ["desktop", "mobile"]) {
    const directory = new URL(
      `../public/videos/hero-frames/${variant}/`,
      import.meta.url,
    );
    const names = await fs.readdir(directory);
    assert.equal(names.length, HERO_FRAME_COUNT);
    for (let frame = 1; frame <= HERO_FRAME_COUNT; frame++) {
      const name = `frame-${String(frame).padStart(3, "0")}.webp`;
      const data = await fs.readFile(new URL(name, directory));
      assert.equal(data.subarray(0, 4).toString(), "RIFF");
      assert.equal(data.subarray(8, 12).toString(), "WEBP");
      assert.ok(data.length > 1000);
      if (variant === "mobile") {
        assert.equal(data.subarray(12, 16).toString(), "VP8 ");
        assert.equal(data.readUInt16LE(26) & 0x3fff, 840);
        assert.equal(data.readUInt16LE(28) & 0x3fff, 1080);
      }
    }
  }
});

async function harness({ mobile = false, blockedIndex = -1, failedIndex = -1 } = {}) {
  const globals = ["window", "document", "fetch", "createImageBitmap", "ResizeObserver", "requestAnimationFrame", "cancelAnimationFrame"];
  const previous = new Map(globals.map(key => [key, globalThis[key]]));
  const callbacks = new Map(), downloads = [], paints = [], bitmaps = [];
  let nextId = 0, hidden = false, activeFetch = 0, peakFetch = 0, activeDecode = 0, peakDecode = 0;
  let releaseBlockedDownload;
  const listeners = new Map();
  globalThis.window = { innerWidth: mobile ? 390 : 1440, devicePixelRatio: 2, navigator: { deviceMemory: 4 } };
  globalThis.document = {
    get hidden() { return hidden; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
  };
  globalThis.requestAnimationFrame = callback => { callbacks.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = id => callbacks.delete(id);
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback(); }
    disconnect() {}
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(!options.signal.aborted);
    const index = Number(url.match(/frame-(\d+)/)[1]) - 1;
    downloads.push({index, url, priority: options.priority});
    peakFetch = Math.max(peakFetch, ++activeFetch);
    if (index === blockedIndex) await new Promise(resolve => { releaseBlockedDownload = resolve; });
    else await new Promise(resolve => setImmediate(resolve));
    activeFetch--;
    return { ok: index !== failedIndex, blob: async () => ({ index }) };
  };
  globalThis.createImageBitmap = async ({index}) => {
    peakDecode = Math.max(peakDecode, ++activeDecode);
    await new Promise(resolve => setImmediate(resolve));
    activeDecode--;
    const bitmap = { index, width: mobile ? 840 : 1600, height: mobile ? 1080 : 900, closed: false, close() { this.closed = true; } };
    bitmaps.push(bitmap);
    return bitmap;
  };
  const canvas = {
    getContext: () => ({ drawImage(bitmap) { assert.ok(!bitmap.closed); paints.push(bitmap.index); } }),
    getBoundingClientRect: () => ({ width: mobile ? 390 : 1200, height: mobile ? 800 : 700 }),
  };
  let ready = 0, bufferReady = 0, failure = 0;
  const progress = [], bufferProgress = [];
  const renderer = new HeroSequence(
    canvas,
    () => ready++,
    value => progress.push(value),
    mobile ? "mobile" : "desktop",
    () => failure++,
    value => bufferProgress.push(value),
    () => bufferReady++,
  );
  const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
  const frame = async () => {
    const queued = [...callbacks.values()]; callbacks.clear();
    for (const callback of queued) callback();
    await settle();
  };
  return {
    renderer, downloads, paints, progress, bufferProgress, callbacks, bitmaps, frame, settle,
    get ready() { return ready; }, get bufferReady() { return bufferReady; }, get failure() { return failure; }, get peakFetch() { return peakFetch; }, get peakDecode() { return peakDecode; },
    releaseBlockedDownload() { releaseBlockedDownload?.(); },
    async setHidden(value) { hidden = value; listeners.get("visibilitychange")?.(); await settle(); },
    async finish() {
      renderer.destroy(); await settle();
      assert.ok(bitmaps.every(bitmap => bitmap.closed));
      assert.equal(callbacks.size, 0);
      for (const [key, value] of previous) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
      }
    },
  };
}

for (const mobile of [false, true]) {
  test(`${mobile ? "mobile" : "desktop"} loads only its frame set and plays every frame both ways`, async () => {
    const h = await harness({ mobile });
    try {
      await h.renderer.load();
      assert.equal(h.ready, 1);
      assert.equal(h.paints[0], 0, "First canvas frame is painted before it is revealed");
      assert.deepEqual(h.bufferProgress[0], { downloaded: 1, decoded: 0 });
      assert.equal(h.bufferReady, 0, "Opening frame alone cannot clear the startup gate");
      for (let i = 0; i < 30 && !h.bufferReady; i++) await h.settle();
      assert.deepEqual(h.bufferProgress.at(-1), {
        downloaded: HERO_STARTUP_DOWNLOAD_FRAMES,
        decoded: HERO_STARTUP_DECODE_FRAMES,
      }, "Startup completes only after the download and decode targets are met");
      assert.equal(h.bufferReady, 1);
      h.renderer.render(1);
      for (let i = 0; i < 150 && h.paints.at(-1) !== 123; i++) await h.frame();
      assert.deepEqual(h.paints.slice(0, 124), Array.from({length:124}, (_,i)=>i));
      h.renderer.render(0);
      for (let i = 0; i < 150 && h.paints.at(-1) !== 0; i++) await h.frame();
      assert.deepEqual(h.paints.slice(124), Array.from({length:123}, (_,i)=>122-i));
      assert.equal(h.downloads.length, 124);
      assert.ok(h.downloads.every(({url})=>url.includes(mobile ? "/mobile/" : "/desktop/")));
      assert.equal(h.peakFetch, 8);
      assert.ok(h.downloads.filter(({ index }) => index > 0 && index <= 12)
        .every(({ priority }) => priority === "high"),
      "Upcoming frames should have high network priority");
      assert.equal(h.downloads.find(({ index }) => index === 13)?.priority, "low",
        "Distant background frames should yield to upcoming frames");
      assert.ok(h.peakDecode <= (mobile ? 2 : 3));
      assert.equal(h.progress.at(-1), 0);
      assert.equal(h.renderer.isComplete, false);
      h.renderer.render(1);
      for (let i = 0; i < 150 && !h.renderer.isComplete; i++) await h.frame();
      assert.equal(h.renderer.isComplete, true, "Completion reports only after the final source frame is painted");
      assert.ok(h.bitmaps.filter(bitmap=>!bitmap.closed).length <= (mobile ? 10 : 16));
    } finally { await h.finish(); }
  });
}

test("startup buffer waits for consecutive downloaded frames even when later requests finish", async () => {
  const h = await harness({ blockedIndex: 20 });
  try {
    await h.renderer.load();
    for (let i = 0; i < 30 && h.downloads.length < 40; i++) await h.settle();
    assert.ok(h.downloads.length >= 40, "Background loading continues past a delayed frame");
    assert.equal(h.bufferReady, 0);
    assert.equal(h.bufferProgress.at(-1).downloaded, 20);
    assert.equal(h.bufferProgress.at(-1).decoded, HERO_STARTUP_DECODE_FRAMES);
    h.releaseBlockedDownload();
    for (let i = 0; i < 10 && !h.bufferReady; i++) await h.settle();
    assert.equal(h.bufferReady, 1);
  } finally {
    h.releaseBlockedDownload();
    await h.finish();
  }
});

test("a missing required frame fails the sequence instead of trapping the hero", async () => {
  const h = await harness({ failedIndex: 1 });
  try {
    await h.renderer.load();
    h.renderer.render(1);
    for (let i = 0; i < 10 && !h.failure; i++) await h.frame();
    assert.equal(h.failure, 1);
  } finally { await h.finish(); }
});

test("background downloading continues without scrolling and pauses while the tab is hidden", async () => {
  const h = await harness();
  try {
    await h.renderer.load();
    await h.setHidden(true);
    const before = h.downloads.length;
    await h.settle();
    assert.equal(h.downloads.length, before);
    await h.setHidden(false);
    for (let i = 0; i < 30 && h.downloads.length < 124; i++) await h.settle();
    assert.equal(h.downloads.length, 124);
    assert.equal(h.paints.at(-1), 0);
  } finally { await h.finish(); }
});
