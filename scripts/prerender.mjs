import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import React from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);
try {
  const result = await build({
    entryPoints: ["src/App.tsx"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    jsx: "automatic",
    mainFields: ["module", "main"],
    plugins: [{
      name: "shared-react",
      setup(builder) {
        builder.onResolve({ filter: /^react(\/.*)?$/ }, args => ({
          path: pathToFileURL(require.resolve(args.path)).href,
          external: true,
        }));
      },
    }],
  });
  const { default: App } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  const dom = new JSDOM(await readFile("dist/index.html", "utf8"));
  const document = dom.window.document;
  document.getElementById("root").innerHTML = renderToString(React.createElement(App));
  // The complete stylesheet is small; inline it to eliminate a render-blocking request.
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const style = document.createElement("style");
    style.textContent = await readFile(`dist${link.getAttribute("href")}`, "utf8");
    link.replaceWith(style);
  }
  await writeFile("dist/index.html", dom.serialize());
  dom.window.close();
  console.log("Pre-rendered page content and inlined production CSS.");
} catch (error) {
  console.error("Pre-render failed: " + error.message);
  process.exitCode = 1;
}
