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
const { HeroSequence, HERO_FRAME_COUNT } = await import(
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
        assert.equal(data.readUInt16LE(26) & 0x3fff, 1920);
        assert.equal(data.readUInt16LE(28) & 0x3fff, 1080);
      }
    }
  }
});

async function harness({ mobile = false, gateFetch = false } = {}) {
  const keys = ["window", "fetch", "createImageBitmap", "ResizeObserver", "requestAnimationFrame", "cancelAnimationFrame"];
  const originals = new Map(keys.map(key => [key, globalThis[key]]));
  const raf = new Map(), pendingFetch = new Map(), pendingDecode = new Map();
  const draws = [], bitmaps = [], fetches = [];
  let id = 0, tick = 0, holdDecode = false, activeFetch = 0, activeDecode = 0, peakFetch = 0, peakDecode = 0;
  let resize, disconnected = false;
  let bounds = { width: mobile ? 390 : 1200, height: mobile ? 800 : 700 };
  const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
  globalThis.window = { innerWidth: mobile ? 390 : 1440, devicePixelRatio: 3 };
  globalThis.requestAnimationFrame = callback => { raf.set(++id, callback); return id; };
  globalThis.cancelAnimationFrame = id => raf.delete(id);
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() { resize(); }
    disconnect() { disconnected = true; }
  };
  globalThis.fetch = async (url, options) => {
    const index = Number(url.match(/frame-(\d+)/)[1]) - 1;
    assert.ok(!options.signal.aborted);
    fetches.push(index);
    peakFetch = Math.max(peakFetch, ++activeFetch);
    if (gateFetch && index > 4) await new Promise(resolve => pendingFetch.set(index, resolve));
    else await new Promise(resolve => setImmediate(resolve));
    activeFetch--;
    return { ok: true, blob: async () => ({ index }) };
  };
  globalThis.createImageBitmap = async ({ index }) => {
    peakDecode = Math.max(peakDecode, ++activeDecode);
    if (holdDecode) await new Promise(resolve => pendingDecode.set(index, resolve));
    else await new Promise(resolve => setImmediate(resolve));
    activeDecode--;
    const bitmap = { index, width: mobile ? 1920 : 1600, height: mobile ? 1080 : 900, closed: false, close() { this.closed = true; } };
    bitmaps.push(bitmap);
    return bitmap;
  };
  const canvas = {
    getContext: () => ({ drawImage(bitmap) {
      assert.ok(!bitmap.closed);
      assert.notEqual(draws.at(-1)?.tick, tick, "At most one canvas draw per screen refresh");
      draws.push({ index: bitmap.index, tick });
    } }),
    getBoundingClientRect: () => bounds,
  };
  let ready = 0;
  const renderer = new HeroSequence(canvas, () => ready++);
  const frame = async () => {
    const callbacks = [...raf.values()]; raf.clear(); tick++;
    for (const callback of callbacks) callback(tick * 1000 / 60);
    await settle();
  };
  const runTo = async target => {
    renderer.render(target / (HERO_FRAME_COUNT - 1));
    for (let i = 0; i < 350 && draws.at(-1)?.index !== target; i++) await frame();
    assert.equal(draws.at(-1)?.index, target, "Backlog must reach the latest destination");
    await frame();
  };
  return {
    renderer, canvas, draws, bitmaps, fetches, raf, pendingFetch, pendingDecode, frame, runTo, settle,
    get ready() { return ready; },
    get peakFetch() { return peakFetch; }, get peakDecode() { return peakDecode; },
    holdDecodes: () => { holdDecode = true; },
    releaseDecode(index) { const resolve = pendingDecode.get(index); pendingDecode.delete(index); resolve?.(); },
    releaseFetch(index) { const resolve = pendingFetch.get(index); pendingFetch.delete(index); resolve?.(); },
    resize(next) { if (next) bounds = next; resize(); },
    async start() { await renderer.load(); await settle(); await frame(); await frame(); },
    async cleanup() {
      renderer.destroy(); holdDecode = false;
      for (const resolve of pendingFetch.values()) resolve();
      for (const resolve of pendingDecode.values()) resolve();
      await settle();
      assert.equal(raf.size, 0, "Unmount cancels animation work");
      assert.ok(disconnected);
      assert.ok(bitmaps.every(bitmap => bitmap.closed), "Cached and late bitmaps close on disposal");
      for (const [key, value] of originals) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
      }
    },
  };
}

for (const mobile of [false, true]) {
  test(`${mobile ? "mobile" : "desktop"} keeps its opening buffer and catches up in bounded forward/reverse steps`, async () => {
    const h = await harness({ mobile });
    try {
      await h.start();
      assert.equal(h.ready, 1);
      assert.deepEqual(h.fetches, Array.from({length: mobile ? 12 : 20}, (_, i) => i));
      for (const destination of [20, 100, 40, 123, 0]) {
        const start = h.draws.at(-1).index;
        const from = h.draws.length;
        await h.runTo(destination);
        const route = [start, ...h.draws.slice(from).map(draw => draw.index)];
        for (let i = 1; i < route.length; i++) {
          assert.ok(Math.abs(route[i] - route[i - 1]) <= 4, "No jump exceeds four source frames");
          assert.equal(Math.sign(route[i] - route[i - 1]), Math.sign(destination - start));
        }
        if (Math.abs(destination - start) > 4) assert.ok(route.length > 2);
      }
      assert.ok(h.peakFetch <= (mobile ? 4 : 6));
      assert.ok(h.peakDecode <= (mobile ? 3 : 4));
      assert.ok(h.bitmaps.filter(bitmap => !bitmap.closed).length <= (mobile ? 12 : 32));
      assert.equal(new Set(h.fetches).size, h.fetches.length, "Each compressed frame downloads once");
      if (mobile) { assert.equal(h.canvas.width, 527); assert.equal(h.canvas.height, 1080); }
      await h.frame(); await h.frame();
      assert.equal(h.raf.size, 0, "No animation loop remains after catch-up");
    } finally { await h.cleanup(); }
  });
}

test("many scroll updates coalesce, and reversing replaces the old destination on the next refresh", async () => {
  const h = await harness();
  try {
    await h.start(); await h.runTo(20);
    const before = h.draws.length;
    for (let i = 0; i < 100; i++) h.renderer.render((i % 2 ? 123 : 90) / 123);
    assert.equal(h.draws.length, before);
    assert.equal(h.raf.size, 1);
    await h.frame();
    assert.ok(h.draws.at(-1).index > 20 && h.draws.at(-1).index <= 24);
    const reversal = h.draws.at(-1).index;
    h.renderer.render(0);
    await h.frame();
    assert.ok(h.draws.at(-1).index < reversal);
    await h.runTo(0);
    assert.ok(!h.draws.slice(before).some(draw => draw.index > 24), "Do not replay the obsolete destination");
  } finally { await h.cleanup(); }
});

test("blocked downloads pause the backlog without polling, then resume without a large jump", async () => {
  const h = await harness({ gateFetch: true });
  try {
    await h.start();
    h.renderer.render(1);
    for (let i = 0; i < 10; i++) await h.frame();
    assert.equal(h.draws.at(-1).index, 4);
    assert.equal(h.raf.size, 0);
    const count = h.draws.length;
    for (const index of [...h.pendingFetch.keys()]) h.releaseFetch(index);
    await h.settle();
    assert.equal(h.draws.length, count, "Decode completion waits for the screen refresh");
    await h.frame();
    assert.ok(h.draws.at(-1).index > 4 && h.draws.at(-1).index <= 8);
  } finally { await h.cleanup(); }
});

test("out-of-order decodes cannot overshoot the intermediate playback target", async () => {
  const h = await harness();
  try {
    await h.start(); await h.runTo(20);
    h.holdDecodes(); h.renderer.render(1);
    for (let i = 0; i < 30; i++) await h.frame();
    const previous = h.draws.at(-1).index;
    const pending = [...h.pendingDecode.keys()].sort((a,b) => b-a);
    assert.ok(pending.length > 0);
    for (const index of pending) { h.releaseDecode(index); await h.settle(); await h.frame(); }
    const later = h.draws.filter(draw => draw.index > previous).map(draw => draw.index);
    let last = previous;
    for (const index of later) { assert.ok(index-last <= 4); last=index; }
    assert.ok(h.peakDecode <= 4);
  } finally { await h.cleanup(); }
});

test("resize redraws the current position without restarting the backlog", async () => {
  const h = await harness();
  try {
    await h.start(); await h.runTo(40);
    const count = h.draws.length;
    h.resize(); await h.frame();
    assert.equal(h.draws.length, count);
    h.resize({width:1000,height:600}); await h.frame();
    assert.equal(h.draws.length, count + 1);
    assert.equal(h.draws.at(-1).index, 40);
    assert.ok(h.canvas.width <= 1600 && h.canvas.height <= 900);
  } finally { await h.cleanup(); }
});
