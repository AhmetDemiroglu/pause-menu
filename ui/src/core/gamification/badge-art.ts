// Rozet ve seviye amblemi cizimi: saf fonksiyonlar, SVG metni uretir.
//
// Ayni dosya web (satir ici SVG), mobil (react-native-svg SvgXml) ve statik dosya uretimi
// (ui/public/assets/badges/v2/*.svg) tarafindan kullanilir. Bu yuzden:
//   - filtre YOK (feGaussianBlur vb. mobilde tutarsiz); derinlik gradyan ve opaklikla verilir,
//   - yazi YOK (font farki); seviye cizgilerle (seritler, yildiz, tac) anlatilir,
//   - her id bir onekle uretilir (web'de ayni sayfada onlarca rozet var).
//
// Dil: CERCEVE kategoriyi (kalkan icerik, mucevher koleksiyon, altigen topluluk, disli madalya
// baglilik, yildiz ozel), METAL kademeyi (bronz, gumus, altin, platin, elmas), SIMGE aileyi soyler.
// Kademe ayrica alttaki noktalarla da okunur (renk korlugu icin).

export type BadgeArtSpec = {
    family: string;
    category: string;
    tier: number;
    threshold: number;
};

export type BadgeArtOptions = {
    locked?: boolean;
    idPrefix?: string;
    title?: string;
};

type Metal = { dark: string; mid: string; light: string; shine: string; glyphTop: string; glyphBottom: string };

export const TIER_METALS: Record<number, Metal> = {
    1: { dark: "#5b3418", mid: "#b06a34", light: "#f0b47c", shine: "#ffe2c4", glyphTop: "#fff3e6", glyphBottom: "#f2c08f" },
    2: { dark: "#4b5563", mid: "#9aa3b2", light: "#e5e9f0", shine: "#ffffff", glyphTop: "#ffffff", glyphBottom: "#d4d9e2" },
    3: { dark: "#7a4d00", mid: "#d49a1c", light: "#ffe28a", shine: "#fff7d6", glyphTop: "#fffbe8", glyphBottom: "#ffd765" },
    4: { dark: "#1f4e5f", mid: "#5fa8c2", light: "#d6f6ff", shine: "#ffffff", glyphTop: "#ffffff", glyphBottom: "#bdeeff" },
    5: { dark: "#3b1d8f", mid: "#8b5cf6", light: "#f0e2ff", shine: "#ffffff", glyphTop: "#ffffff", glyphBottom: "#e4d0ff" },
};

/** Tekil (kademesiz) rozetler: marka morundan amber parlamaya. */
const SPECIAL_METAL: Metal = {
    dark: "#5b2a00",
    mid: "#e08a1e",
    light: "#ffd27a",
    shine: "#fff4d8",
    glyphTop: "#fffaf0",
    glyphBottom: "#ffd58a",
};

const LOCKED_METAL: Metal = {
    dark: "#2b2d35",
    mid: "#4a4d58",
    light: "#6c707d",
    shine: "#8a8e9b",
    glyphTop: "#7d818e",
    glyphBottom: "#5d616d",
};

type Enamel = { inner: string; outer: string };

const CATEGORY_ENAMEL: Record<string, Enamel> = {
    content: { inner: "#3b47b8", outer: "#141a52" },
    collection: { inner: "#0f8a78", outer: "#03302c" },
    social: { inner: "#c0265a", outer: "#4a0820" },
    dedication: { inner: "#c2560c", outer: "#4a1b02" },
    special: { inner: "#7c3aed", outer: "#2a0d63" },
};

const LOCKED_ENAMEL: Enamel = { inner: "#33353f", outer: "#1a1b21" };

/** Seviye amblemleri: 1 kursun, 2 bronz, 3 gumus, 4 altin, 5 platin, 6 yakut, 7 prizma. */
const LEVEL_METALS: Record<number, Metal> = {
    1: { dark: "#334155", mid: "#7b8aa0", light: "#d5dde8", shine: "#f1f5f9", glyphTop: "#f8fafc", glyphBottom: "#cbd5e1" },
    2: TIER_METALS[1],
    3: TIER_METALS[2],
    4: TIER_METALS[3],
    5: TIER_METALS[4],
    6: { dark: "#6b0f2a", mid: "#e11d48", light: "#ffc2cf", shine: "#ffe4ea", glyphTop: "#fff1f4", glyphBottom: "#ffb3c3" },
    7: { dark: "#3b0f7a", mid: "#c026d3", light: "#ffe08a", shine: "#ffffff", glyphTop: "#ffffff", glyphBottom: "#ffe9a8" },
};

const LEVEL_ENAMEL: Record<number, Enamel> = {
    1: { inner: "#334155", outer: "#0f172a" },
    2: { inner: "#5a2e14", outer: "#1c0d04" },
    3: { inner: "#3d4757", outer: "#11161f" },
    4: { inner: "#6b4300", outer: "#211300" },
    5: { inner: "#0e5a73", outer: "#04202b" },
    6: { inner: "#8a1033", outer: "#2a030f" },
    7: { inner: "#5b21b6", outer: "#160634" },
};

// ------------------------------------------------------------------
// Cerceveler (64x64)
// ------------------------------------------------------------------

function polygon(points: [number, number][]): string {
    return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L")} Z`;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function radial(count: number, outer: number, inner: number, rotation = -90): [number, number][] {
    const points: [number, number][] = [];
    for (let i = 0; i < count * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = ((rotation + (i * 180) / count) * Math.PI) / 180;
        points.push([32 + r * Math.cos(a), 32 + r * Math.sin(a)]);
    }
    return points;
}

type Frame = { path: string; glyphCenter: [number, number]; pipsY: number; glyphScale: number };

const FRAMES: Record<string, Frame> = {
    shield: {
        path: "M32 4 L54 11.5 V30 C54 44 44.5 54.5 32 60 C19.5 54.5 10 44 10 30 V11.5 Z",
        glyphCenter: [32, 29],
        pipsY: 47,
        glyphScale: 1,
    },
    gem: {
        path: "M21 5 H43 L59 21 V43 L43 59 H21 L5 43 V21 Z",
        glyphCenter: [32, 30],
        pipsY: 48,
        glyphScale: 1.05,
    },
    hexagon: {
        path: polygon([
            [32, 3.5],
            [56.7, 17.75],
            [56.7, 46.25],
            [32, 60.5],
            [7.3, 46.25],
            [7.3, 17.75],
        ]),
        glyphCenter: [32, 30],
        pipsY: 47.5,
        glyphScale: 1,
    },
    circle: {
        path: polygon(radial(18, 29, 26.6, -90)),
        glyphCenter: [32, 30],
        pipsY: 47,
        glyphScale: 1,
    },
    star: {
        path: polygon(radial(8, 30, 23.5, -90)),
        glyphCenter: [32, 32],
        pipsY: 49,
        glyphScale: 0.95,
    },
    level: {
        path: "M32 3 L52 14.5 V40.5 L32 61 L12 40.5 V14.5 Z",
        glyphCenter: [32, 31],
        pipsY: 49,
        glyphScale: 0.92,
    },
};

const CATEGORY_FRAME: Record<string, string> = {
    content: "shield",
    collection: "gem",
    social: "hexagon",
    dedication: "circle",
    special: "star",
};

// ------------------------------------------------------------------
// Simgeler (24x24 kutu). mode: fill = metal dolgu, stroke = metal cizgi,
// cut = mine rengi oyuk, cutStroke = mine rengi cizgi, soft = yari saydam metal.
// ------------------------------------------------------------------

type GlyphPart =
    | { mode: "fill" | "soft" | "cut"; d: string; rule?: "evenodd" }
    | { mode: "stroke" | "cutStroke"; d: string; width?: number }
    | { mode: "circle" | "cutCircle" | "softCircle"; cx: number; cy: number; r: number };

export const GLYPHS: Record<string, GlyphPart[]> = {
    critic: [
        { mode: "fill", d: "M12 1.5 C14 4 18 7 19.5 9.5 L13.3 20.5 H10.7 L4.5 9.5 C6 7 10 4 12 1.5 Z" },
        { mode: "cutCircle", cx: 12, cy: 10, r: 1.9 },
        { mode: "cut", d: "M11.35 11.6 H12.65 V19.6 H11.35 Z" },
        { mode: "fill", d: "M8.6 21.3 H15.4 A1 1 0 0 1 15.4 23.3 H8.6 A1 1 0 0 1 8.6 21.3 Z" },
    ],
    deep: [
        { mode: "fill", d: "M1.8 5.2 C5.4 3.6 9 3.9 11.3 5.8 V20.6 C9 18.9 5.4 18.7 1.8 20 Z" },
        { mode: "fill", d: "M22.2 5.2 C18.6 3.6 15 3.9 12.7 5.8 V20.6 C15 18.9 18.6 18.7 22.2 20 Z" },
        { mode: "cutStroke", d: "M4.4 9 C6.3 8.5 8 8.6 9.3 9.2 M4.4 12.4 C6.3 11.9 8 12 9.3 12.6 M4.4 15.8 C6.3 15.3 8 15.4 9.3 16", width: 1.1 },
        { mode: "cutStroke", d: "M19.6 9 C17.7 8.5 16 8.6 14.7 9.2 M19.6 12.4 C17.7 11.9 16 12 14.7 12.6", width: 1.1 },
    ],
    genre: [
        { mode: "fill", rule: "evenodd", d: "M12 1.5 A10.5 10.5 0 1 1 11.99 1.5 Z M12 3.9 A8.1 8.1 0 1 0 12.01 3.9 Z" },
        { mode: "fill", d: "M16.6 7.4 L13.4 13.4 L10.6 10.6 Z" },
        { mode: "soft", d: "M7.4 16.6 L10.6 10.6 L13.4 13.4 Z" },
        { mode: "cutCircle", cx: 12, cy: 12, r: 1.15 },
    ],
    author: [
        { mode: "fill", d: "M2.5 9.2 H7 L16.8 3.8 C17.6 3.4 18.4 3.9 18.4 4.8 V19.2 C18.4 20.1 17.6 20.6 16.8 20.2 L7 14.8 H2.5 A1 1 0 0 1 1.5 13.8 V10.2 A1 1 0 0 1 2.5 9.2 Z" },
        { mode: "fill", d: "M7.4 15.6 H10.6 L12 21.3 C12.2 22 11.7 22.6 11 22.6 H9.9 C9.4 22.6 9 22.3 8.9 21.8 Z" },
        { mode: "stroke", d: "M20.6 8.8 C22 10.6 22 13.4 20.6 15.2", width: 1.7 },
    ],
    curator: [
        { mode: "fill", d: "M6 3.5 H18 A2 2 0 0 1 20 5.5 V20.5 A2 2 0 0 1 18 22.5 H6 A2 2 0 0 1 4 20.5 V5.5 A2 2 0 0 1 6 3.5 Z" },
        { mode: "soft", d: "M9 1.6 H15 A1 1 0 0 1 16 2.6 V5.8 H8 V2.6 A1 1 0 0 1 9 1.6 Z" },
        { mode: "cutCircle", cx: 8, cy: 10.2, r: 1.2 },
        { mode: "cutCircle", cx: 8, cy: 14.2, r: 1.2 },
        { mode: "cutCircle", cx: 8, cy: 18.2, r: 1.2 },
        { mode: "cutStroke", d: "M10.8 10.2 H16.6 M10.8 14.2 H16.6 M10.8 18.2 H14.6", width: 1.5 },
    ],
    collector: [
        { mode: "soft", d: "M8.6 1.8 H19.6 A1.6 1.6 0 0 1 21.2 3.4 V17.6 A1.6 1.6 0 0 1 19.6 19.2 H8.6 A1.6 1.6 0 0 1 7 17.6 V3.4 A1.6 1.6 0 0 1 8.6 1.8 Z" },
        { mode: "fill", d: "M4.4 5 H15.4 A1.6 1.6 0 0 1 17 6.6 V20.6 A1.6 1.6 0 0 1 15.4 22.2 H4.4 A1.6 1.6 0 0 1 2.8 20.6 V6.6 A1.6 1.6 0 0 1 4.4 5 Z" },
        { mode: "cutCircle", cx: 9.9, cy: 14.2, r: 4.6 },
        { mode: "circle", cx: 9.9, cy: 14.2, r: 1.5 },
        { mode: "cut", d: "M5 7.2 H14.8 V8.4 H5 Z" },
    ],
    wishlist: [
        { mode: "fill", d: "M3.5 8.5 H20.5 A1 1 0 0 1 21.5 9.5 V12.5 A1 1 0 0 1 20.5 13.5 H3.5 A1 1 0 0 1 2.5 12.5 V9.5 A1 1 0 0 1 3.5 8.5 Z" },
        { mode: "fill", d: "M4.5 14.5 H19.5 V21 A1.5 1.5 0 0 1 18 22.5 H6 A1.5 1.5 0 0 1 4.5 21 Z" },
        { mode: "cut", d: "M10.9 8.5 H13.1 V22.5 H10.9 Z" },
        { mode: "fill", d: "M12 8.2 C9.2 8.4 6.2 7.3 6.6 5.1 C7 3 10.2 3.6 12 8.2 Z" },
        { mode: "fill", d: "M12 8.2 C14.8 8.4 17.8 7.3 17.4 5.1 C17 3 13.8 3.6 12 8.2 Z" },
    ],
    favorites: [
        { mode: "fill", d: "M12 21.2 C7 17.3 2.4 13.7 2.4 8.9 C2.4 5.8 4.7 3.5 7.6 3.5 C9.4 3.5 11 4.4 12 5.9 C13 4.4 14.6 3.5 16.4 3.5 C19.3 3.5 21.6 5.8 21.6 8.9 C21.6 13.7 17 17.3 12 21.2 Z" },
        { mode: "soft", d: "M6.2 7 C6.9 6 7.9 5.6 9 5.8 C8 6.2 7.2 7 6.9 8.1 Z" },
    ],
    list_star: [
        { mode: "fill", d: "M12 1.6 L14.95 7.9 L21.9 8.75 L16.75 13.5 L18.15 20.4 L12 16.95 L5.85 20.4 L7.25 13.5 L2.1 8.75 L9.05 7.9 Z" },
        { mode: "cutStroke", d: "M9.3 11.4 H14.7 M9.9 13.9 H14.1", width: 1.3 },
    ],
    popular: [
        { mode: "fill", d: "M2.8 7.6 L7.6 11.8 L12 3.6 L16.4 11.8 L21.2 7.6 L19.2 18.6 H4.8 Z" },
        { mode: "fill", d: "M4.8 19.8 H19.2 A1 1 0 0 1 20.2 20.8 V21.6 A1 1 0 0 1 19.2 22.6 H4.8 A1 1 0 0 1 3.8 21.6 V20.8 A1 1 0 0 1 4.8 19.8 Z" },
        { mode: "cutCircle", cx: 12, cy: 14.2, r: 1.7 },
        { mode: "cutCircle", cx: 7.6, cy: 15.4, r: 1.05 },
        { mode: "cutCircle", cx: 16.4, cy: 15.4, r: 1.05 },
        { mode: "circle", cx: 2.8, cy: 7, r: 1.4 },
        { mode: "circle", cx: 12, cy: 2.8, r: 1.5 },
        { mode: "circle", cx: 21.2, cy: 7, r: 1.4 },
    ],
    social: [
        { mode: "circle", cx: 9.5, cy: 7.4, r: 4 },
        { mode: "fill", d: "M2 21.4 C2 16.4 5.3 13.3 9.5 13.3 C13.7 13.3 17 16.4 17 21.4 A0.9 0.9 0 0 1 16.1 22.3 H2.9 A0.9 0.9 0 0 1 2 21.4 Z" },
        { mode: "stroke", d: "M19.3 7.4 V14.2 M15.9 10.8 H22.7", width: 2.3 },
    ],
    commenter: [
        { mode: "soft", d: "M9.5 2 H20 A2.5 2.5 0 0 1 22.5 4.5 V10.5 A2.5 2.5 0 0 1 20 13 H19.5 V16 L16.3 13 H9.5 A2.5 2.5 0 0 1 7 10.5 V4.5 A2.5 2.5 0 0 1 9.5 2 Z" },
        { mode: "fill", d: "M4 7.6 H14.5 A2.5 2.5 0 0 1 17 10.1 V16.3 A2.5 2.5 0 0 1 14.5 18.8 H8.6 L4.6 22.2 V18.8 H4 A2.5 2.5 0 0 1 1.5 16.3 V10.1 A2.5 2.5 0 0 1 4 7.6 Z" },
        { mode: "cutCircle", cx: 5.6, cy: 13.2, r: 1.25 },
        { mode: "cutCircle", cx: 9.25, cy: 13.2, r: 1.25 },
        { mode: "cutCircle", cx: 12.9, cy: 13.2, r: 1.25 },
    ],
    liked: [
        { mode: "fill", d: "M7.2 10.4 L11 3 C12.7 3 14 4.4 13.8 6 L13.3 9.4 H19 C20.5 9.4 21.6 10.8 21.3 12.3 L19.8 19.5 C19.5 20.8 18.4 21.7 17.1 21.7 H7.2 Z" },
        { mode: "fill", d: "M2.3 10.4 H5.9 V21.7 H2.3 A0.8 0.8 0 0 1 1.5 20.9 V11.2 A0.8 0.8 0 0 1 2.3 10.4 Z" },
        { mode: "softCircle", cx: 3.7, cy: 19.3, r: 0.9 },
    ],
    streak: [
        { mode: "soft", d: "M12 1.2 C13.1 5.2 18.4 8 18.4 14.2 C18.4 18.9 15.6 22.8 12 22.8 C8.4 22.8 5.6 18.9 5.6 14.6 C5.6 11.6 7 9.4 8.6 7.9 C8.7 10.2 9.7 11.8 11.1 12.3 C10.3 8.4 11 4.4 12 1.2 Z" },
        { mode: "fill", d: "M12 8.6 C13 11.2 16 13 16 16.9 C16 19.8 14.2 22 12 22 C9.8 22 8 19.8 8 17.1 C8 15.3 8.9 14 9.9 13.1 C10.1 14.5 10.7 15.4 11.5 15.7 C11 13.3 11.4 10.6 12 8.6 Z" },
    ],
    veteran: [
        { mode: "fill", d: "M5 1.8 H19 A1 1 0 0 1 20 2.8 V3.6 A1 1 0 0 1 19 4.6 H5 A1 1 0 0 1 4 3.6 V2.8 A1 1 0 0 1 5 1.8 Z" },
        { mode: "fill", d: "M5 19.4 H19 A1 1 0 0 1 20 20.4 V21.2 A1 1 0 0 1 19 22.2 H5 A1 1 0 0 1 4 21.2 V20.4 A1 1 0 0 1 5 19.4 Z" },
        { mode: "stroke", d: "M6.8 4.6 C6.8 8.8 10 10.6 10.8 12 C10 13.4 6.8 15.2 6.8 19.4 M17.2 4.6 C17.2 8.8 14 10.6 13.2 12 C14 13.4 17.2 15.2 17.2 19.4", width: 1.8 },
        { mode: "fill", d: "M9.2 7 H14.8 C14.3 8.7 12.9 9.9 12 10.8 C11.1 9.9 9.7 8.7 9.2 7 Z" },
        { mode: "fill", d: "M8.6 19.2 C8.9 16.9 10.6 15.6 12 15.2 C13.4 15.6 15.1 16.9 15.4 19.2 Z" },
        { mode: "soft", d: "M11.6 12.4 H12.4 V15.6 H11.6 Z" },
    ],
    welcome: [
        { mode: "fill", d: "M6.8 6.5 H17.2 C20.2 6.5 22.4 9.2 22.6 13.3 L22.9 17.2 C23.1 19.6 20.6 20.9 18.9 19.4 L16 16.8 H8 L5.1 19.4 C3.4 20.9 0.9 19.6 1.1 17.2 L1.4 13.3 C1.6 9.2 3.8 6.5 6.8 6.5 Z" },
        { mode: "cut", d: "M6.9 9.7 H8.6 V11.2 H10.1 V12.9 H8.6 V14.4 H6.9 V12.9 H5.4 V11.2 H6.9 Z" },
        { mode: "cutCircle", cx: 16.3, cy: 10.8, r: 1.15 },
        { mode: "cutCircle", cx: 18.6, cy: 13.1, r: 1.15 },
        { mode: "cutCircle", cx: 14.1, cy: 13.1, r: 1.15 },
    ],
    profile_complete: [
        { mode: "fill", d: "M4 4.5 H20 A2 2 0 0 1 22 6.5 V18.5 A2 2 0 0 1 20 20.5 H4 A2 2 0 0 1 2 18.5 V6.5 A2 2 0 0 1 4 4.5 Z" },
        { mode: "cutCircle", cx: 8.3, cy: 10.6, r: 2.4 },
        { mode: "cut", d: "M4.6 17.4 C4.6 15 6.2 13.9 8.3 13.9 C10.4 13.9 12 15 12 17.4 Z" },
        { mode: "cutStroke", d: "M14 9.6 H19 M14 12.6 H19 M14 15.6 H17.2", width: 1.5 },
    ],
};

/** Seviye simgeleri: 1-3 serit, 4 yildiz, 5 yildiz + serit, 6 yildiz + iki serit, 7 tac + yildiz. */
const CHEVRON = (y: number) => `M4 ${y + 6} L12 ${y} L20 ${y + 6} V${y + 9.6} L12 ${y + 3.6} L4 ${y + 9.6} Z`;
const STAR = "M12 1.6 L14.95 7.9 L21.9 8.75 L16.75 13.5 L18.15 20.4 L12 16.95 L5.85 20.4 L7.25 13.5 L2.1 8.75 L9.05 7.9 Z";

function levelGlyph(level: number): GlyphPart[] {
    switch (level) {
        case 1:
            return [{ mode: "fill", d: CHEVRON(8) }];
        case 2:
            return [{ mode: "fill", d: CHEVRON(4.5) }, { mode: "fill", d: CHEVRON(11.5) }];
        case 3:
            return [{ mode: "fill", d: CHEVRON(1.5) }, { mode: "fill", d: CHEVRON(8) }, { mode: "fill", d: CHEVRON(14.5) }];
        case 4:
            return [{ mode: "fill", d: STAR }];
        case 5:
            return [
                { mode: "fill", d: scalePath(STAR, 0.78, 12, 6.5) },
                { mode: "fill", d: CHEVRON(15) },
            ];
        case 6:
            return [
                { mode: "fill", d: scalePath(STAR, 0.66, 12, 5) },
                { mode: "fill", d: CHEVRON(12) },
                { mode: "soft", d: CHEVRON(17) },
            ];
        default:
            return [
                { mode: "fill", d: "M3.5 6.8 L7.6 10 L12 3.4 L16.4 10 L20.5 6.8 L18.9 13.6 H5.1 Z" },
                { mode: "fill", d: scalePath(STAR, 0.5, 12, 17.6) },
                { mode: "circle", cx: 3.5, cy: 6.2, r: 1.1 },
                { mode: "circle", cx: 12, cy: 2.7, r: 1.2 },
                { mode: "circle", cx: 20.5, cy: 6.2, r: 1.1 },
            ];
    }
}

/** Basit M/L/H/V/Z yolunu (12,12) merkezli olcekleyip (cx,cy)'ye tasir. */
function scalePath(d: string, scale: number, cx: number, cy: number): string {
    return d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x: string, y: string) =>
        `${round(cx + (Number(x) - 12) * scale)} ${round(cy + (Number(y) - 12) * scale)}`,
    );
}

// ------------------------------------------------------------------
// Cizim
// ------------------------------------------------------------------

function esc(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderGlyph(parts: GlyphPart[], ids: Ids, enamel: Enamel): string {
    return parts
        .map((part) => {
            switch (part.mode) {
                case "fill":
                    return `<path d="${part.d}" fill="url(#${ids.glyph})"${part.rule ? ` fill-rule="${part.rule}"` : ""}/>`;
                case "soft":
                    return `<path d="${part.d}" fill="url(#${ids.glyph})" opacity="0.55"/>`;
                case "cut":
                    return `<path d="${part.d}" fill="${enamel.outer}"/>`;
                case "stroke":
                    return `<path d="${part.d}" fill="none" stroke="url(#${ids.glyph})" stroke-width="${part.width ?? 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
                case "cutStroke":
                    return `<path d="${part.d}" fill="none" stroke="${enamel.outer}" stroke-width="${part.width ?? 1.4}" stroke-linecap="round"/>`;
                case "circle":
                    return `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}" fill="url(#${ids.glyph})"/>`;
                case "softCircle":
                    return `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}" fill="url(#${ids.glyph})" opacity="0.55"/>`;
                case "cutCircle":
                    return `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}" fill="${enamel.outer}"/>`;
            }
        })
        .join("");
}

type Ids = { rim: string; rimEdge: string; enamel: string; glyph: string; sheen: string; clip: string };

function makeIds(prefix: string): Ids {
    const p = prefix.replace(/[^a-zA-Z0-9_-]/g, "") || "b";
    return { rim: `${p}-rim`, rimEdge: `${p}-edge`, enamel: `${p}-en`, glyph: `${p}-gl`, sheen: `${p}-sh`, clip: `${p}-cl` };
}

type Composition = {
    frame: Frame;
    metal: Metal;
    enamel: Enamel;
    glyph: GlyphPart[];
    pips: number;
    wings: number;
    locked: boolean;
    title?: string;
    idPrefix: string;
};

const INNER_SCALE = 0.8;

function compose(c: Composition): string {
    const ids = makeIds(c.idPrefix);
    const { frame, metal, enamel } = c;
    const inner = `translate(32 32) scale(${INNER_SCALE}) translate(-32 -32)`;
    const [gx, gy] = frame.glyphCenter;
    const s = frame.glyphScale * (c.pips > 0 ? 1.12 : 1.2);
    const glyphTransform = `translate(${round(gx - 12 * s)} ${round(gy - 12 * s - (c.pips > 0 ? 1.5 : 0))}) scale(${round(s)})`;

    const wings =
        c.wings > 0
            ? `<g fill="url(#${ids.rim})" stroke="${metal.dark}" stroke-width="0.6" stroke-linejoin="round">${wingPaths(c.wings)}</g>`
            : "";

    const pips =
        c.pips > 0
            ? `<g>${Array.from({ length: c.pips }, (_, i) => {
                  const x = 32 + (i - (c.pips - 1) / 2) * 4.6;
                  return `<circle cx="${round(x)}" cy="${frame.pipsY}" r="1.55" fill="url(#${ids.glyph})" stroke="${enamel.outer}" stroke-width="0.5"/>`;
              }).join("")}</g>`
            : "";

    const lock = c.locked
        ? `<g transform="translate(43 43)"><circle cx="7" cy="7" r="7.4" fill="#16171c" stroke="#5d616d" stroke-width="1"/><path d="M4.6 6.4 V5.2 A2.4 2.4 0 0 1 9.4 5.2 V6.4" fill="none" stroke="#a3a7b3" stroke-width="1.3"/><rect x="3.6" y="6.3" width="6.8" height="4.9" rx="1.1" fill="#a3a7b3"/></g>`
        : "";

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`,
        c.title ? `<title>${esc(c.title)}</title>` : "",
        `<defs>`,
        `<linearGradient id="${ids.rim}" x1="0" y1="0" x2="0" y2="1">`,
        `<stop offset="0" stop-color="${metal.light}"/><stop offset="0.38" stop-color="${metal.shine}"/>`,
        `<stop offset="0.52" stop-color="${metal.mid}"/><stop offset="1" stop-color="${metal.dark}"/>`,
        `</linearGradient>`,
        `<linearGradient id="${ids.rimEdge}" x1="0" y1="0" x2="0" y2="1">`,
        `<stop offset="0" stop-color="${metal.dark}"/><stop offset="1" stop-color="${metal.light}"/>`,
        `</linearGradient>`,
        `<radialGradient id="${ids.enamel}" cx="0.5" cy="0.38" r="0.62">`,
        `<stop offset="0" stop-color="${enamel.inner}"/><stop offset="1" stop-color="${enamel.outer}"/>`,
        `</radialGradient>`,
        `<linearGradient id="${ids.glyph}" x1="0" y1="0" x2="0" y2="1">`,
        `<stop offset="0" stop-color="${metal.glyphTop}"/><stop offset="1" stop-color="${metal.glyphBottom}"/>`,
        `</linearGradient>`,
        `<linearGradient id="${ids.sheen}" x1="0" y1="0" x2="0" y2="1">`,
        `<stop offset="0" stop-color="#ffffff" stop-opacity="${c.locked ? 0.08 : 0.32}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>`,
        `</linearGradient>`,
        `<clipPath id="${ids.clip}"><path d="${frame.path}" transform="${inner}"/></clipPath>`,
        `</defs>`,
        wings,
        `<path d="${frame.path}" fill="#000000" opacity="0.28" transform="translate(0 1.6)"/>`,
        `<path d="${frame.path}" fill="url(#${ids.rim})"/>`,
        `<path d="${frame.path}" fill="none" stroke="${metal.dark}" stroke-width="0.9" opacity="0.8"/>`,
        `<path d="${frame.path}" transform="translate(32 32) scale(0.9) translate(-32 -32)" fill="none" stroke="${metal.shine}" stroke-width="0.8" opacity="0.55"/>`,
        `<path d="${frame.path}" transform="${inner}" fill="url(#${ids.enamel})"/>`,
        `<path d="${frame.path}" transform="${inner}" fill="none" stroke="url(#${ids.rimEdge})" stroke-width="1.4"/>`,
        `<g transform="${glyphTransform}">`,
        `<g transform="translate(0 0.9)" opacity="0.45">${renderGlyph(c.glyph, { ...ids, glyph: ids.rimEdge }, { inner: enamel.outer, outer: enamel.outer }).replace(/url\(#[^)]+\)/g, enamel.outer)}</g>`,
        renderGlyph(c.glyph, ids, enamel),
        `</g>`,
        pips,
        `<g clip-path="url(#${ids.clip})"><ellipse cx="32" cy="12" rx="30" ry="17" fill="url(#${ids.sheen})"/></g>`,
        lock,
        `</svg>`,
    ].join("");
}

function wingPaths(count: number): string {
    const left = [
        "M13 20 C7 19.5 2.5 23 1.5 28 C4.6 26.8 7.8 26.8 11.5 28.2 Z",
        "M12.5 28.6 C7.5 28.6 3.6 31.6 2.8 35.8 C5.6 34.8 8.4 34.8 11.8 36 Z",
        "M12 36.4 C8 36.6 5 39 4.4 42.4 C6.8 41.6 9.2 41.6 12.4 42.6 Z",
    ].slice(0, count);
    const mirror = (d: string) =>
        d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x: string, y: string) => `${round(64 - Number(x))} ${y}`);
    return [...left, ...left.map(mirror)].map((d) => `<path d="${d}"/>`).join("");
}

/** Rozet SVG'si. Bilinmeyen aile icin yildiz cerceveli genel bir rozet doner (asla bos degil). */
export function renderBadgeSvg(spec: BadgeArtSpec, options: BadgeArtOptions = {}): string {
    const locked = !!options.locked;
    const idPrefix = options.idPrefix ?? `b-${spec.family}-${spec.tier}-${spec.threshold}`;

    if (spec.family === "level") {
        return renderLevelSvg(spec.threshold, { ...options, idPrefix });
    }

    const frame = FRAMES[CATEGORY_FRAME[spec.category] ?? "star"];
    const baseMetal = spec.tier > 0 ? TIER_METALS[Math.min(spec.tier, 5)] : SPECIAL_METAL;
    return compose({
        frame,
        metal: locked ? LOCKED_METAL : baseMetal,
        enamel: locked ? LOCKED_ENAMEL : CATEGORY_ENAMEL[spec.category] ?? CATEGORY_ENAMEL.special,
        glyph: GLYPHS[spec.family] ?? GLYPHS.list_star,
        pips: spec.tier > 0 ? spec.tier : 0,
        wings: 0,
        locked,
        title: options.title,
        idPrefix,
    });
}

/** Seviye amblemi (1-7). Profil basligi ve seviye rozetleri ayni cizimi kullanir. */
export function renderLevelSvg(level: number, options: BadgeArtOptions = {}): string {
    const safe = Math.min(Math.max(Math.round(level) || 1, 1), 7);
    const locked = !!options.locked;
    return compose({
        frame: FRAMES.level,
        metal: locked ? LOCKED_METAL : LEVEL_METALS[safe],
        enamel: locked ? LOCKED_ENAMEL : LEVEL_ENAMEL[safe],
        glyph: levelGlyph(safe),
        pips: 0,
        wings: safe >= 5 ? safe - 4 : 0,
        locked,
        title: options.title,
        idPrefix: options.idPrefix ?? `lv-${safe}`,
    });
}

/** Arayuz cipleri icin kademe rengi (metin/kenar). */
export function tierAccent(tier: number): string {
    return tier > 0 ? TIER_METALS[Math.min(tier, 5)].mid : SPECIAL_METAL.mid;
}
