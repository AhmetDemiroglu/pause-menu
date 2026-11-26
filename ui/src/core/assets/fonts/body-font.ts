import localFont from "next/font/local";

/**
 * Sitenin govde fontu: Inter 4.001 (SIL OFL 1.1, OFL-Inter.txt).
 *
 * Neden tek dosya: Google fontu "latin" ve "latin-ext" diye ikiye boluyor; ğ Ğ İ ş Ş ikinci
 * dosyada. display "optional" iken ilk dosya zamaninda yetisip ikincisi yetismezse bu harfler
 * yedek fonttan ciziliyor ve kelimeler karisik gorunuyordu. Burada latin araligi ile Turkce
 * harfler ve ₺ ayni dosyada: font ya tamamen gelir ya hic gelmez. On yuklenen tek dosya 47 KB
 * (onceki iki on yukleme 48 + 85 KB).
 *
 * Uretim (fontTools): Inter[opsz,wght].ttf, opsz=14'e sabitlenir (Google'in verdigi kesim),
 * alt kumeler asagidaki araliklardan alinir. Ana dosya: U+0000-00FF, 0131, 0152-0153,
 * 02BB-02BC, 02C6, 02DA, 02DC, 0304, 0308, 0329, 2000-206F, 20AC, 2122, 2191, 2193, 2212,
 * 2215, FEFF, FFFD, 011E-011F, 0130, 015E-015F, 20BA. Ozellikler: calt ccmp dnom frac locl
 * numr pnum tnum kern mark mkmk. Hinting yok, woff2.
 */
const interTr = localFont({
    src: "./inter-latin-tr.woff2",
    weight: "100 900",
    // "optional": font ilk boyaya yetismezse o sayfa yuklemesi metrik uyumlu yedek fontla kalir,
    // degisim (swap) olmaz. "swap" ile Lighthouse LCP'yi font degisim anina tasiyordu: Inter Black
    // yedekten genis, hero basligi bir satir buyuyor ve yeni LCP girdisi yaziliyordu (LCP 4.4 sn,
    // FCP 1.4 sn). Font onbellege girdikten sonra (ikinci sayfadan itibaren) ilk boyada gelir.
    display: "optional",
    adjustFontFallback: "Arial",
});

// Diger diller (Lehce, Cekce, Vietnamca...). On yukleme yok, yalnizca sayfada o harf gecince iner.
// unicode-range ana dosyayla CAKISMAZ: cakisirsa ana dosya gecikince tarayici latin harfler icin
// de bu dosyalara gecip indiriyor ve karisik gorunum geri geliyor.
const interExt = localFont({
    src: "./inter-latin-ext.woff2",
    weight: "100 900",
    display: "swap",
    preload: false,
    adjustFontFallback: false,
    declarations: [
        {
            prop: "unicode-range",
            value: "U+0100-011D, U+0120-012F, U+0132-0151, U+0154-015D, U+0160-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-0301, U+0303, U+0309, U+0323, U+1D00-1DBF, U+1E00-1EFF, U+20A0-20AB, U+20AD-20B9, U+20BB-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
        },
    ],
});

// Kiril ve Yunan.
const interCyrillicGreek = localFont({
    src: "./inter-cyrillic-greek.woff2",
    weight: "100 900",
    display: "swap",
    preload: false,
    adjustFontFallback: false,
    declarations: [
        {
            prop: "unicode-range",
            value: "U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-052F, U+1C80-1C8A, U+1F00-1FFF, U+2116, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
        },
    ],
});

// Sira onemli: once ana dosya, sonra diger diller, en son Arial tabanli yedek.
const [primary, ...fallbacks] = interTr.style.fontFamily.split(",").map((family) => family.trim());

export const bodyFontFamily = [primary, interExt.style.fontFamily, interCyrillicGreek.style.fontFamily, ...fallbacks].join(", ");
