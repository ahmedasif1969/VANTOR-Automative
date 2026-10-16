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

test("renderer handles forward, reverse, rapid changes, and disposal with bounded decoding", async () => {
  const originals = new Map(
    ["window", "fetch", "createImageBitmap", "ResizeObserver"].map((key) => [
      key,
      globalThis[key],
    ]),
  );
  const draws = [];
  const bitmaps = [];
  let ready = 0;
  let disconnected = false;
  globalThis.window = { innerWidth: 1440, devicePixelRatio: 1 };
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback();
    }
    disconnect() {
      disconnected = true;
    }
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(!options.signal.aborted);
    await new Promise((resolve) => setImmediate(resolve));
    return {
      ok: true,
      blob: async () => ({ index: Number(url.match(/frame-(\d+)/)[1]) - 1 }),
    };
  };
  globalThis.createImageBitmap = async ({ index }) => {
    const bitmap = {
      index,
      width: 1600,
      height: 900,
      closed: false,
      close() {
        this.closed = true;
      },
    };
    bitmaps.push(bitmap);
    return bitmap;
  };
  const canvas = {
    getContext: () => ({
      drawImage(bitmap) {
        assert.ok(!bitmap.closed);
        draws.push(bitmap.index);
      },
    }),
    getBoundingClientRect: () => ({ width: 1200, height: 700 }),
  };
  const settle = async () => {
    for (let index = 0; index < 30; index++)
      await new Promise((resolve) => setImmediate(resolve));
  };
  const renderer = new HeroSequence(canvas, () => ready++);
  try {
    await renderer.load();
    await settle();
    assert.equal(ready, 1);
    assert.equal(draws.at(-1), 0);
    renderer.render(1);
    await settle();
    assert.equal(draws.at(-1), HERO_FRAME_COUNT - 1);
    renderer.render(0.5);
    await settle();
    assert.equal(draws.at(-1), Math.round((HERO_FRAME_COUNT - 1) / 2));
    renderer.render(0);
    await settle();
    assert.equal(draws.at(-1), 0);
    for (let index = 0; index < 100; index++)
      renderer.render(index % 2 ? 0.2 : 0.9);
    renderer.render(0.7);
    await settle();
    assert.equal(draws.at(-1), Math.round(0.7 * (HERO_FRAME_COUNT - 1)));
    assert.ok(bitmaps.filter((bitmap) => !bitmap.closed).length <= 32);
    renderer.destroy();
    await settle();
    assert.ok(disconnected);
    assert.ok(bitmaps.every((bitmap) => bitmap.closed));
    const count = draws.length;
    renderer.render(0.1);
    assert.equal(draws.length, count);
  } finally {
    renderer.destroy();
    for (const [key, value] of originals) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

async function controlledRenderer({ mobile = false, gateFetch = false } = {}) {
  const originals = new Map(
    ["window", "fetch", "createImageBitmap", "ResizeObserver"].map((key) => [
      key,
      globalThis[key],
    ]),
  );
  const draws = [],
    bitmaps = [],
    fetches = [],
    decodes = [];
  const pendingFetch = new Map(),
    pendingDecode = new Map();
  let holdDecode = false,
    activeFetch = 0,
    activeDecode = 0,
    peakFetch = 0,
    peakDecode = 0;
  let resize;
  const settle = async () => {
    for (let index = 0; index < 80; index++)
      await new Promise((resolve) => setImmediate(resolve));
  };
  globalThis.window = { innerWidth: mobile ? 390 : 1440, devicePixelRatio: 3 };
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resize = callback;
    }
    observe() {
      resize();
    }
    disconnect() {}
  };
  globalThis.fetch = async (url, options) => {
    const index = Number(url.match(/frame-(\d+)/)[1]) - 1;
    assert.ok(!options.signal.aborted);
    fetches.push(index);
    peakFetch = Math.max(peakFetch, ++activeFetch);
    if (gateFetch && index > 4)
      await new Promise((resolve) => pendingFetch.set(index, resolve));
    else await new Promise((resolve) => setImmediate(resolve));
    activeFetch--;
    return { ok: true, blob: async () => ({ index }) };
  };
  globalThis.createImageBitmap = async ({ index }) => {
    decodes.push(index);
    peakDecode = Math.max(peakDecode, ++activeDecode);
    if (holdDecode)
      await new Promise((resolve) => pendingDecode.set(index, resolve));
    else await new Promise((resolve) => setImmediate(resolve));
    activeDecode--;
    const bitmap = {
      index,
      width: mobile ? 1920 : 1600,
      height: mobile ? 1080 : 900,
      closed: false,
      close() {
        this.closed = true;
      },
    };
    bitmaps.push(bitmap);
    return bitmap;
  };
  const canvas = {
    getContext: () => ({
      drawImage(bitmap) {
        assert.ok(!bitmap.closed);
        draws.push(bitmap.index);
      },
    }),
    getBoundingClientRect: () => ({
      width: mobile ? 390 : 1200,
      height: mobile ? 800 : 700,
    }),
  };
  const renderer = new HeroSequence(canvas, () => {});
  return {
    renderer,
    canvas,
    draws,
    bitmaps,
    fetches,
    decodes,
    settle,
    pendingDecode,
    pendingFetch,
    holdDecodes: () => {
      holdDecode = true;
    },
    releaseDecode: (index) => {
      const resolve = pendingDecode.get(index);
      pendingDecode.delete(index);
      resolve?.();
    },
    releaseFetch: (index) => {
      const resolve = pendingFetch.get(index);
      pendingFetch.delete(index);
      resolve?.();
    },
    peakFetch: () => peakFetch,
    peakDecode: () => peakDecode,
    resize: () => resize(),
    async cleanup() {
      renderer.destroy();
      holdDecode = false;
      for (const resolve of pendingDecode.values()) resolve();
      for (const resolve of pendingFetch.values()) resolve();
      await settle();
      assert.ok(
        bitmaps.every((bitmap) => bitmap.closed),
        "All cached and late bitmaps must close",
      );
      for (const [key, value] of originals) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}

test("a missing exact frame draws its nearest decoded neighbor immediately, then catches up", async () => {
  const h = await controlledRenderer();
  try {
    await h.renderer.load();
    await h.settle();
    h.renderer.render(0.08);
    await h.settle();
    h.renderer.render(0);
    await h.settle();
    h.holdDecodes();
    const ready = h.bitmaps
      .filter((bitmap) => !bitmap.closed)
      .map((bitmap) => bitmap.index);
    const previous = h.draws.at(-1);
    h.renderer.render(62 / (HERO_FRAME_COUNT - 1));
    const nearest = ready.reduce((best, index) =>
      Math.abs(index - 62) < Math.abs(best - 62) ? index : best,
    );
    assert.notEqual(nearest, previous);
    assert.equal(
      h.draws.at(-1),
      nearest,
      "Must not freeze waiting for exact decode",
    );
    await h.settle();
    assert.ok(h.pendingDecode.has(62));
    h.releaseDecode(62);
    await h.settle();
    assert.equal(h.draws.at(-1), 62);
    const count = h.draws.length;
    h.resize();
    assert.equal(
      h.draws.length,
      count,
      "Unchanged resize must not clear/redraw the canvas",
    );
    assert.ok(h.canvas.width <= 1600 && h.canvas.height <= 900);
  } finally {
    await h.cleanup();
  }
});

test("new targets get reserved decoder capacity and obsolete results cannot overwrite them", async () => {
  const h = await controlledRenderer();
  try {
    await h.renderer.load();
    await h.settle();
    h.holdDecodes();
    h.renderer.render(62 / (HERO_FRAME_COUNT - 1));
    await h.settle();
    assert.equal(
      h.pendingDecode.size,
      3,
      "One desktop slot must remain available for a new target",
    );
    h.renderer.render(1);
    await h.settle();
    assert.ok(
      h.pendingDecode.has(123),
      "Latest target must start without waiting for speculative decodes",
    );
    h.releaseDecode(123);
    await h.settle();
    assert.equal(h.draws.at(-1), 123);
    for (const index of [62, 63, 64]) h.releaseDecode(index);
    await h.settle();
    assert.equal(h.draws.at(-1), 123);
    assert.ok(
      h.bitmaps
        .filter((bitmap) => [62, 63, 64].includes(bitmap.index))
        .every((bitmap) => bitmap.closed),
    );
    assert.ok(h.peakDecode() <= 4);
  } finally {
    await h.cleanup();
  }
});

test("bounded network preloading reprioritizes the latest jump instead of an outdated target", async () => {
  const h = await controlledRenderer({ gateFetch: true });
  try {
    await h.renderer.load();
    await h.settle();
    h.renderer.render(0.05);
    await h.settle();
    assert.equal(h.pendingFetch.size, 6);
    h.renderer.render(1);
    h.renderer.render(62 / (HERO_FRAME_COUNT - 1));
    const before = h.fetches.length;
    h.releaseFetch(h.pendingFetch.keys().next().value);
    await h.settle();
    assert.equal(
      h.fetches[before],
      62,
      "The latest target must lead the next network batch",
    );
    assert.equal(
      new Set(h.fetches).size,
      h.fetches.length,
      "Each compressed frame is fetched only once",
    );
    assert.ok(h.peakFetch() <= 6);
  } finally {
    await h.cleanup();
  }
});

for (const mobile of [false, true]) {
test(`opening the page warms ${mobile ? 12 : 20} frames before scrolling begins`, async () => {
  const h = await controlledRenderer({ mobile });
  const openingFrameCount = mobile ? 12 : 20;
  try {
    await h.renderer.load();
    await h.settle();
    h.renderer.render(0);
    h.renderer.render(0);
    await h.settle();
    assert.deepEqual(h.fetches, Array.from({ length: openingFrameCount }, (_, index) => index));
    assert.ok(h.bitmaps.some((bitmap) => bitmap.index === 1 && !bitmap.closed));
    h.renderer.render(0.5);
    await h.settle();
    assert.equal(h.draws.at(-1), 62);
    assert.ok(h.fetches.length > openingFrameCount && h.fetches.length <= openingFrameCount + (mobile ? 12 : 32));
  } finally {
    await h.cleanup();
  }
});
}

test("mobile uses a smaller cache and reverse scrolling changes preload direction", async () => {
  const h = await controlledRenderer({ mobile: true });
  try {
    await h.renderer.load();
    await h.settle();
    h.renderer.render(62 / (HERO_FRAME_COUNT - 1));
    await h.settle();
    assert.equal(h.draws.at(-1), 62);
    const before = h.decodes.length;
    h.renderer.render(61 / (HERO_FRAME_COUNT - 1));
    await h.settle();
    assert.equal(h.draws.at(-1), 61);
    assert.ok(h.decodes.slice(before).length > 0);
    assert.ok(
      h.decodes[before] < 61,
      "Reverse look-ahead should decode frames behind the target first",
    );
    assert.ok(h.bitmaps.filter((bitmap) => !bitmap.closed).length <= 12);
    assert.ok(h.peakDecode() <= 3 && h.peakFetch() <= 4);
    assert.equal(h.canvas.width, 527);
    assert.equal(h.canvas.height, 1080);
    h.renderer.render(0);
    await h.settle();
    assert.equal(h.draws.at(-1), 0);
  } finally {
    await h.cleanup();
  }
});
