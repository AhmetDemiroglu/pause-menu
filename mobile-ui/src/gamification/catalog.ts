// Gamification katalogu: seviyeler, XP kurallari ve 66 rozet.
//
// KAYNAK backend/GGHub.Core/Gamification/catalog.json. Bu klasordeki catalog.json onun birebir
// kopyasidir; mobile-ui/src/gamification altinda da ayni uc dosya durur. Elle duzenleme:
// backend dosyasini degistir, sonra `scripts/gamification-sync` calistir.
// Rozet kodu kurali backend GamificationCatalog.Build ile aynidir:
//   tekil aile -> aile anahtari, seviye ailesi -> level_<esik>, digerleri -> <aile>_<kademe>.

import raw from "./catalog.json";

export type CatalogLocale = "tr" | "en";
export type LocalizedText = { tr: string; en: string };

export type CatalogLevel = { number: number; requiredXp: number; name: LocalizedText };
export type CatalogRule = {
    key: string;
    xp: number;
    shortXp?: number;
    minLength?: number;
    minGames?: number;
    dailyCap: number | null;
    label: LocalizedText;
    note: LocalizedText;
};
export type CatalogCategory = { key: string; frame: string; name: LocalizedText };
export type CatalogBadge = {
    code: string;
    family: string;
    category: string;
    tier: number;
    metric: string;
    threshold: number;
    xpReward: number;
    sortOrder: number;
    title: LocalizedText;
    description: LocalizedText;
};

type RawFamily = {
    key: string;
    category: string;
    metric: string;
    thresholds: number[];
    single?: boolean;
    levelBadges?: boolean;
    reward?: number;
    name: LocalizedText;
    summary: LocalizedText;
    unit?: LocalizedText;
    description: LocalizedText;
    descriptionOne?: LocalizedText;
};

type RawCatalog = {
    version: number;
    tierRewards: number[];
    tiers: { tier: number; key: string; name: LocalizedText }[];
    levels: CatalogLevel[];
    xpRules: CatalogRule[];
    categories: CatalogCategory[];
    families: RawFamily[];
};

const data = raw as unknown as RawCatalog;

export const CATALOG_LEVELS: CatalogLevel[] = [...data.levels].sort((a, b) => a.number - b.number);
export const CATALOG_RULES: CatalogRule[] = data.xpRules;
export const CATALOG_CATEGORIES: CatalogCategory[] = data.categories;
export const CATALOG_TIERS = data.tiers;
export const MAX_LEVEL = CATALOG_LEVELS[CATALOG_LEVELS.length - 1].number;

function buildBadges(): CatalogBadge[] {
    const tierNames = new Map(data.tiers.map((t) => [t.tier, t.name]));
    const categoryOrder = new Map(data.categories.map((c, i) => [c.key, i]));
    const levelNames = new Map(CATALOG_LEVELS.map((l) => [l.number, l.name]));
    const badges: CatalogBadge[] = [];

    data.families.forEach((family, familyIndex) => {
        family.thresholds.forEach((threshold, i) => {
            const tier = family.single || family.levelBadges ? 0 : i + 1;
            const code = family.single ? family.key : family.levelBadges ? `level_${threshold}` : `${family.key}_${i + 1}`;
            const reward =
                family.reward ?? (tier > 0 ? data.tierRewards[Math.min(tier, data.tierRewards.length) - 1] : 0);

            let title: LocalizedText;
            if (family.levelBadges) {
                const levelName = levelNames.get(threshold) ?? { tr: "", en: "" };
                title = { tr: `Seviye ${threshold}: ${levelName.tr}`, en: `Level ${threshold}: ${levelName.en}` };
            } else if (tier > 0) {
                const tierName = tierNames.get(tier)!;
                title = { tr: `${tierName.tr} ${family.name.tr}`, en: `${tierName.en} ${family.name.en}` };
            } else {
                title = family.name;
            }

            const template = threshold === 1 && family.descriptionOne ? family.descriptionOne : family.description;
            badges.push({
                code,
                family: family.key,
                category: family.category,
                tier,
                metric: family.metric,
                threshold,
                xpReward: reward,
                sortOrder: (categoryOrder.get(family.category) ?? 0) * 1000 + familyIndex * 10 + i,
                title,
                description: {
                    tr: template.tr.replaceAll("{n}", String(threshold)),
                    en: template.en.replaceAll("{n}", String(threshold)),
                },
            });
        });
    });

    return badges;
}

export const CATALOG_BADGES: CatalogBadge[] = buildBadges();

export type CatalogFamily = {
    key: string;
    category: string;
    name: LocalizedText;
    summary: LocalizedText;
    unit?: LocalizedText;
    badges: CatalogBadge[];
};

/** Aile basina tek kart (herkese acik katalog): ad, kisa aciklama ve kademeler. */
export const CATALOG_FAMILIES: CatalogFamily[] = data.families.map((f) => ({
    key: f.key,
    category: f.category,
    name: f.name,
    summary: f.summary,
    unit: f.unit,
    badges: CATALOG_BADGES.filter((b) => b.family === f.key),
}));

const BADGES_BY_CODE = new Map(CATALOG_BADGES.map((b) => [b.code, b]));

/** Eski sunucu yanitlari kod tasimiyordu (yalniz baslik). Yeni web eski API'ye de dayansin. */
const LEGACY_TITLES: Record<string, string> = {
    Novice: "welcome",
    Critic: "critic_1",
    Curator: "curator_1",
    Popular: "popular_2",
};

export function findBadge(code?: string | null, legacyTitle?: string | null): CatalogBadge | undefined {
    if (code) {
        const byCode = BADGES_BY_CODE.get(code);
        if (byCode) return byCode;
    }
    if (legacyTitle) {
        const mapped = LEGACY_TITLES[legacyTitle] ?? legacyTitle.match(/^Level ([2-7])$/)?.[1];
        if (mapped) return BADGES_BY_CODE.get(mapped.length === 1 ? `level_${mapped}` : mapped);
    }
    return undefined;
}

export function toCatalogLocale(locale: string | undefined | null): CatalogLocale {
    return locale && locale.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function pickText(text: LocalizedText, locale: string | undefined | null): string {
    return text[toCatalogLocale(locale)];
}

export function levelForXp(xp: number): number {
    let level = 1;
    for (const def of CATALOG_LEVELS) if (xp >= def.requiredXp) level = def.number;
    return level;
}

export function levelName(level: number, locale: string | undefined | null): string {
    const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
    const def = CATALOG_LEVELS.find((l) => l.number === clamped) ?? CATALOG_LEVELS[0];
    return pickText(def.name, locale);
}

export function tierName(tier: number, locale: string | undefined | null): string | null {
    const def = CATALOG_TIERS.find((t) => t.tier === tier);
    return def ? pickText(def.name, locale) : null;
}
