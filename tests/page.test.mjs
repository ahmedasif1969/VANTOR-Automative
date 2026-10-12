import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import fs from "node:fs/promises";

const require = createRequire(import.meta.url);
const result = await build({
  entryPoints: ["src/App.tsx"],
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
let html;
try {
  const { default: App } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
  html = renderToStaticMarkup(React.createElement(App));
} catch (error) {
  // Avoid printing the entire bundled data URL in Node's exception stack.
  throw new Error("Static page render failed: " + error.message);
}

test("all required sections render, with the featured car immediately after the hero", () => {
  const ids = [...html.matchAll(/<section[^>]+id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(ids, [
    "top",
    "featured",
    "statement",
    "collection",
    "story",
    "experience",
    "contact",
  ]);
  assert.match(html, /The art of<br\/>performance\./);
  assert.match(html, /Not/);
  assert.match(html, /experience\./);
  for (const text of [
    "Beyond the ordinary.",
    "Find your drive.",
    "Your next chapter starts here.",
  ])
    assert.ok(html.includes('<span class="sr-only">' + text + "</span>"), text);
});

test("motion headings and specification counters preserve complete accessible content", () => {
  assert.equal((html.match(/data-motion-heading=/g) || []).length, 4);
  assert.equal((html.match(/class="motion-heading-line"/g) || []).length, 8);
  for (const value of ["502", "3.2", "197"]) {
    assert.ok(html.includes('<span class="sr-only">' + value + "</span>"));
    assert.ok(
      html.includes('aria-hidden="true" data-motion-number="' + value + '"'),
    );
  }
  assert.equal(
    (html.match(/class="card-media-scroll size-full"/g) || []).length,
    6,
  );
  assert.ok(html.includes('class="page-scroll-progress" aria-hidden="true"'));
});

test("the landing-page statement has one accessible sentence and individually highlightable words", () => {
  const sentence =
    "A remarkable car does more than move you. It changes the rhythm of a road, the feeling of a journey, and the way you arrive.";
  assert.ok(html.includes('<span class="sr-only">' + sentence + "</span>"));
  const words = [
    ...html.matchAll(
      /class="scroll-highlight-word inline-block">([^<]+)<\/span>/g,
    ),
  ].map((match) => match[1]);
  assert.deepEqual(words, sentence.split(" "));
  assert.ok(html.includes('aria-labelledby="statement-heading"'));
});

test("the philosophy heading cannot be left fixed by a ScrollTrigger pin", async () => {
  const app = await fs.readFile(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(app, /pin\s*:\s*["']\.ownership-heading["']/);
  assert.doesNotMatch(app, /pin\s*:\s*["']\.ownership-story["']/);
  const component = await fs.readFile(
    new URL("../src/components/Ownership.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(component, /\b(?:fixed|sticky)\b/);
});

test("the highlight effect is scroll-scrubbed, reduced-motion-aware, scoped, and unpinned", async () => {
  const component = await fs.readFile(
    new URL("../src/components/ScrollStatement.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /scrub:\s*0\.35/);
  assert.match(component, /stagger:\s*0\.14/);
  assert.match(component, /prefers-reduced-motion:\s*no-preference/);
  assert.match(component, /scope:\s*root/);
  assert.match(component, /match\.revert\(\)/);
  assert.doesNotMatch(component, /pin\s*:/);
});

test("initial content is usable before animation code, and navigation anchors resolve", () => {
  assert.equal((html.match(/data-flip-id=/g) || []).length, 6);
  for (const id of ["collection", "story", "experience", "contact"]) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes("Price: Low to High"));
  assert.ok(html.includes("Price: High to Low"));
  assert.ok(html.includes("Name: A–Z"));
  assert.ok(html.includes("drive-recommendation"));
});

test("hero does not autoplay and the contact form does not promise a server submission", () => {
  assert.ok(!html.includes("/videos/vantor-hero.mp4"), "Fallback video must not download with the initial HTML");
  assert.ok(!html.includes("autoPlay"));
  assert.ok(!html.includes("autoplay"));
  assert.ok(
    html.includes("does not send your information or book an appointment"),
  );
  assert.ok(html.includes('aria-labelledby="vehicle-dialog-title"'));
  assert.ok(html.includes("placeholder destination"));
});
