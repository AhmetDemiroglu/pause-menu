import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Module } from "node:module";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const webDir = join(here, "..", "src/core/gamification");
const mobileDir = join(repo, "mobile-ui/src/gamification");

function load(file) {
    const loaded = new Module(file);
    loaded.filename = file;
    loaded.paths = Module._nodeModulePaths(dirname(file));
    loaded._compile(
        ts.transpileModule(readFileSync(file, "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
        }).outputText,
        file,
    );
    return loaded.exports;
}

const catalog = load(join(webDir, "catalog.ts"));
const art = load(join(webDir, "badge-art.ts"));

test("Web and mobile copies are byte-identical to the backend catalog (run scripts/gamification-sync)", () => {
    const source = readFileSync(join(repo, "backend/GGHub.Core/Gamification/catalog.json"));
    assert.ok(source.equals(readFileSync(join(webDir, "catalog.json"))), "ui catalog.json drifted");
    assert.ok(source.equals(readFileSync(join(mobileDir, "catalog.json"))), "mobile catalog.json drifted");
    for (const name of ["catalog.ts", "badge-art.ts"]) {
        assert.ok(readFileSync(join(webDir, name)).equals(readFileSync(join(mobileDir, name))), `mobile ${name} drifted`);
    }
});

test("Catalog builds 66 unique badges, same count as the backend test", () => {
    assert.equal(catalog.CATALOG_BADGES.length, 66);
    assert.equal(new Set(catalog.CATALOG_BADGES.map((b) => b.code)).size, 66);
});

test("Every family has its own glyph and every badge has a static SVG", () => {
    const families = new Set(catalog.CATALOG_BADGES.map((b) => b.family));
    for (const family of families) {
        if (family === "level") continue;
        assert.ok(art.GLYPHS[family], `glyph missing for ${family}`);
    }
    const staticDir = join(here, "..", "public/assets/badges/v2");
    const files = new Set(readdirSync(staticDir));
    for (const badge of catalog.CATALOG_BADGES) assert.ok(files.has(`${badge.code}.svg`), `${badge.code}.svg missing`);
    for (let level = 1; level <= 7; level++) assert.ok(existsSync(join(staticDir, `level_${level}.svg`)));
});

test("Badge SVGs are self-contained: prefixed ids, no filters, no text, both states", () => {
    for (const badge of catalog.CATALOG_BADGES) {
        for (const locked of [false, true]) {
            const svg = art.renderBadgeSvg(badge, { idPrefix: "zz", locked });
            assert.match(svg, /^<svg[^>]+viewBox="0 0 64 64"/);
            assert.doesNotMatch(svg, /<filter|<text|undefined|NaN/);
            for (const [, id] of svg.matchAll(/id="([^"]+)"/g)) assert.ok(id.startsWith("zz-"), id);
        }
    }
    const unknown = art.renderBadgeSvg({ family: "nope", category: "nope", tier: 0, threshold: 0 });
    assert.match(unknown, /<svg/);
});

test("Texts exist in both languages without dashes", () => {
    for (const badge of catalog.CATALOG_BADGES) {
        for (const text of [badge.title.tr, badge.title.en, badge.description.tr, badge.description.en]) {
            assert.ok(text && !/[–—]|\{n\}/.test(text), `${badge.code}: ${text}`);
        }
    }
    for (const rule of catalog.CATALOG_RULES) {
        for (const text of [rule.label.tr, rule.label.en, rule.note.tr, rule.note.en]) assert.ok(text && !/[–—]/.test(text));
    }
});

test("Level math matches the published thresholds", () => {
    assert.equal(catalog.levelForXp(0), 1);
    assert.equal(catalog.levelForXp(99), 1);
    assert.equal(catalog.levelForXp(100), 2);
    assert.equal(catalog.levelForXp(5000), 7);
    assert.equal(catalog.levelName(4, "tr"), "Deneyimli");
    assert.equal(catalog.levelName(4, "en-US"), "Experienced");
});

test("Old API responses without codes still map to the new art", () => {
    assert.equal(catalog.findBadge(undefined, "Critic")?.code, "critic_1");
    assert.equal(catalog.findBadge(undefined, "Level 3")?.code, "level_3");
    assert.equal(catalog.findBadge("streak_2")?.threshold, 7);
});
