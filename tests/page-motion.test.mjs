import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../src/lib/pageMotion.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

function install(desktop) {
  const tweens = [];
  const timelines = [];
  const nodes = new Map();
  const node = (name) => {
    if (!nodes.has(name)) nodes.set(name, { name });
    return nodes.get(name);
  };
  const steps = [0, 1, 2].map((index) => ({
    name: "step" + index,
    querySelector: (selector) => node("step" + index + selector),
  }));
  const headings = [0, 1, 2, 3].map((index) => ({
    name: "heading" + index,
    querySelectorAll: () => [
      node("line" + index + "a"),
      node("line" + index + "b"),
    ],
  }));
  const numbers = ["502", "3.2", "197"].map((value) => ({
    dataset: { motionNumber: value },
    textContent: value,
    closest: () => node("spec" + value),
  }));
  const groups = {
    "[data-motion-heading]": headings,
    "[data-motion-copy]": [node("copy")],
    "[data-motion-rule]": [node("rule")],
    "[data-motion-number]": numbers,
    ".ownership-step": steps,
    ".discovery-choice": [node("choice0"), node("choice1"), node("choice2")],
  };
  const root = {
    querySelectorAll: (selector) => groups[selector] ?? [],
    querySelector: node,
  };
  const gsap = {
    fromTo: (target, from, to) => tweens.push({ target, from, to }),
    to: (target, to) => tweens.push({ target, to }),
    timeline: (options) => {
      timelines.push(options);
      const timeline = {
        fromTo: (target, from, to, position) => {
          tweens.push({ target, from, to, position, timeline: options });
          return timeline;
        },
      };
      return timeline;
    },
  };
  const exports = {};
  new Function("require", "exports", compiled)(
    () => ({ default: gsap }),
    exports,
  );
  const cleanup = exports.installPageMotion(root, desktop);
  return { tweens, timelines, numbers, cleanup };
}

test("desktop choreography scrubs headings, alternating media, dividers and progress without pins or image darkening", () => {
  const { tweens, timelines, cleanup } = install(true);
  assert.equal(timelines.length, 3);
  assert.ok(timelines.every((options) => options.scrollTrigger.scrub === 0.5));
  const headings = tweens.filter(
    (tween) =>
      Array.isArray(tween.target) && tween.target[0]?.name.startsWith("line"),
  );
  assert.equal(headings.length, 4);
  assert.ok(
    headings.every(
      (tween) => tween.from.yPercent === 105 && tween.to.yPercent === 0,
    ),
  );
  const media = tweens.filter((tween) =>
    tween.target?.name?.endsWith(".pillar-media"),
  );
  assert.deepEqual(
    media.map((tween) => tween.from.x),
    [-40, 40, -40],
  );
  const images = tweens.filter((tween) =>
    tween.target?.name?.endsWith(".step-image"),
  );
  assert.equal(images.length, 3);
  assert.ok(
    images.every(
      (tween) => tween.from.scale === 1.16 && tween.to.yPercent === 4,
    ),
  );
  assert.ok(
    images.every(
      (tween) => !("opacity" in tween.from) && !("opacity" in tween.to),
    ),
  );
  const progress = tweens.find(
    (tween) => tween.target?.name === ".page-scroll-progress",
  );
  assert.equal(progress.to.scrollTrigger.end, "max");
  for (const { to, timeline } of tweens) {
    const trigger = to.scrollTrigger ?? timeline?.scrollTrigger;
    assert.ok(trigger);
    assert.ok(trigger.scrub);
    assert.equal(trigger.pin, undefined);
  }
  cleanup();
});

test("mobile keeps the same sequence but removes lateral gallery drift and reduces image movement", () => {
  const { tweens, cleanup } = install(false);
  const media = tweens.filter((tween) =>
    tween.target?.name?.endsWith(".pillar-media"),
  );
  assert.ok(media.every((tween) => tween.from.x === 0));
  const images = tweens.filter((tween) =>
    tween.target?.name?.endsWith(".step-image"),
  );
  assert.ok(
    images.every(
      (tween) =>
        tween.from.scale === 1.07 &&
        tween.to.scale === 1 &&
        tween.to.yPercent === 0,
    ),
  );
  assert.equal(
    tweens.find((tween) => tween.target?.name === "copy").from.y,
    16,
  );
  cleanup();
});

test("visual specification counters round correctly, reverse and restore true values on cleanup", () => {
  const { tweens, numbers, cleanup } = install(true);
  const counters = tweens.filter((tween) => tween.to.onUpdate);
  assert.deepEqual(
    counters.map((tween) => tween.to.value),
    [502, 3.2, 197],
  );
  for (const tween of counters) {
    tween.target.value = tween.to.value / 2;
    tween.to.onUpdate();
  }
  assert.deepEqual(
    numbers.map((number) => number.textContent),
    ["251", "1.6", "99"],
  );
  counters[1].target.value = 0.8;
  counters[1].to.onUpdate();
  assert.equal(numbers[1].textContent, "0.8");
  cleanup();
  cleanup();
  assert.deepEqual(
    numbers.map((number) => number.textContent),
    ["502", "3.2", "197"],
  );
});

test("the new layer is owned by the scoped reduced-motion context and adds no ticker or animation loop", async () => {
  const app = await fs.readFile(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  assert.match(app, /motion: "\(prefers-reduced-motion: no-preference\)"/);
  assert.match(app, /if \(context.conditions\?\.motion && root.current\)/);
  assert.match(app, /return installPageMotion\(/);
  assert.match(app, /match\.revert\(\)/);
  assert.match(app, /scope: root/);
  assert.doesNotMatch(
    source,
    /\bpin\s*:|requestAnimationFrame|ticker|addEventListener/,
  );
  const css = await fs.readFile(
    new URL("../src/index.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /prefers-reduced-motion: reduce\)[\s\S]*\.page-scroll-progress\s*\{\s*display: none/,
  );
});
