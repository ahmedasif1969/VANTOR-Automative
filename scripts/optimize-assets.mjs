import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const sharp = require(process.env.VANTOR_SHARP_PATH || "sharp");
const names = ["gt3", "porsche", "supercar", "performance", "grand-tourer", "mustang"];
for (const name of names) {
  for (const width of [480, 800, 1280, ...(name === "gt3" ? [] : [1800])]) {
    await sharp(`public/images/${name}.jpg`)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(`public/images/${name}-${width}.webp`);
  }
}
await mkdir("public/fonts", { recursive: true });
const css = await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@300..600&display=swap", {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
}).then((response) => {
  if (!response.ok) throw new Error("Font stylesheet download failed");
  return response.text();
});
const latin = css.split("/* latin */").pop();
const url = latin.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
if (!url) throw new Error("Latin Geist WOFF2 was not found");
const response = await fetch(url);
if (!response.ok) throw new Error("Font download failed");
await writeFile("public/fonts/geist-latin.woff2", Buffer.from(await response.arrayBuffer()));
await writeFile("public/fonts/OFL.txt", await fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/geist/OFL.txt").then(r => {
  if (!r.ok) throw new Error("Font license download failed");
  return r.text();
}));
