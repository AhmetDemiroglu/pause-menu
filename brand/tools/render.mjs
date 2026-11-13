// Rasterises the SVG sources listed in renders.json (paths relative to brand/).
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const brand = join(dirname(fileURLToPath(import.meta.url)), "..");
const { renders } = JSON.parse(readFileSync(join(brand, "tools", "renders.json"), "utf8"));

for (const { src, out, width } of renders) {
  const svg = readFileSync(join(brand, src));
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  mkdirSync(dirname(join(brand, out)), { recursive: true });
  writeFileSync(join(brand, out), png);
}
console.log(`render ok (${renders.length} files)`);
