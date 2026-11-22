import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Match Vercel's build behavior: skip ESLint during `next build` (Vercel already disables it).
    // Type-checking still runs, so local `next build` now catches type errors instead of failing
    // on pre-existing lint errors first (which previously masked real type errors from Vercel).
    eslint: {
        ignoreDuringBuilds: true,
    },
    // X-Powered-By: Next.js basligi tarayicilara surum ipucu verir, bir ise yaramaz.
    poweredByHeader: false,
    /**
     * Metadata (title, canonical, hreflang, robots) her zaman <head> icinde, tek seferde gelsin.
     * Next 15'in varsayilani metadata'yi govdenin sonuna akitiyordu; Googlebot, GPTBot, ClaudeBot,
     * PerplexityBot varsayilan listede olmadigi icin ham HTML'de canonical <body> icinde kaliyordu
     * (Google govdedeki canonical'i yok sayar). Oyun sayfalari Cloudflare'de 3 gun onbellekli oldugu
     * icin ilk gelen ziyaretci kopyayi belirliyordu. Maliyeti: metadata verisi gelene kadar ilk bayt
     * bekler; sayfa ayni veriyi zaten bekledigi icin fark yok.
     */
    htmlLimitedBots: /.*/,
    /**
     * Oyun detayi Vercel CDN'inde onbellekli. Kok layout headers() okudugu icin sayfa her istekte
     * sunucuda ciziliyor (ISR yok); ~92 bin oyun URL'sini gezen botlar Hobby'nin aylik 4 CPU saatini
     * iki gunde bitirdi (30 Eyl 2026). Vercel-CDN-Cache-Control, Next'in "private, no-store"
     * Cache-Control'unden once gelir ve tarayiciya gitmez. 3 gun taze, sonra 7 gun eskisi sunulurken
     * arkada yenilenir: bir URL en fazla 3 gunde bir cizilir, tum botlar ayni kopyayi alir.
     * Kosul: yanitta Set-Cookie olmamali (middleware bu yolda dil cerezi yazmaz, cdnCachedPathPattern).
     * Istemci initialData'yi bayat sayip veriyi tazeler (game-detail-view, review-list).
     */
    async headers() {
        return [
            {
                source: "/:locale(tr|en-US)/games/:id",
                headers: [{ key: "Vercel-CDN-Cache-Control", value: "s-maxage=259200, stale-while-revalidate=604800" }],
            },
        ];
    },
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        });
        return config;
    },
    images: {
        // Yalniz WebP: AVIF kodlamasi sharp'ta WebP'nin birkac kati CPU ve bellek yiyordu, botlarin
        // gezdigi her kart gorseli Railway'de islemci yakiyordu. Her format ayri onbellek kopyasi demek.
        formats: ["image/webp"],
        /**
         * Optimizer kotuye kullanim freni (/_next/image Cloudflare'de onbelleksiz, her istek Railway'e
         * duser). Kodda quality verilmiyor (varsayilan 75); acik birakilirsa q=1..100 x her genislik
         * ayri bir yeniden isleme demekti. 3840 genisligi kaldirildi: en pahali donusumdu (4K ekran
         * disinda istenmiyordu); 2048 retina hero gorseli icin kaldi. Gorsel adresleri degismiyor (R2 adlari benzersiz, oyun
         * gorselleri sabit), 30 gun onbellek guvenli; varsayilan 60 sn her dakika yeniden isletiyordu.
         */
        qualities: [75],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
        minimumCacheTTL: 2592000,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "localhost",
                port: "7263",
                pathname: "/images/**",
            },
            {
                protocol: "https",
                hostname: "media.rawg.io",
                pathname: "/media/**",
            },
            {
                // Eski demo hesap avatarlari (DemoContentSeeder: i.pravatar.cc/300?u=...). Yol sabit;
                // yolsuz desen optimizer'i bu alan adindaki her gorsel icin acik proxy yapiyordu.
                protocol: "https",
                hostname: "i.pravatar.cc",
                pathname: "/300",
            },
            {
                // AI bot avatarlari (illustrasyon, gercek fotograf DEGIL). AiAgentPersonas.AvatarUrl.
                protocol: "https",
                hostname: "api.dicebear.com",
                pathname: "/9.x/**",
            },
            {
                // R2 (profil fotoğrafı + kapak görseli). Buraya eklenmediği sürece bu görseller
                // next/image'dan geçemiyordu; ham <img> ile tam çözünürlükte iniyorlardı.
                protocol: "https",
                hostname: "assets.pausemenu.app",
            },
            {
                // Google ile giriş yapan kullanıcıların ProfileImageUrl'i doğrudan Google CDN'ini
                // gösteriyor (AuthService, OAuth "picture" alanı).
                // Profil fotograflari /a/ (eskiler /a-/) altinda; yolsuz desen Google'in tum kullanici
                // icerigini optimizer'dan gecirmeye izin veriyordu.
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                pathname: "/a/**",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                pathname: "/a-/**",
            },
            {
                // IGDB kapak/görselleri. Buraya eklenmediği sürece next/image bu görselleri
                // REDDEDİYOR ve hero slaytı bomboş görünüyordu (detay sayfası ham <img>
                // kullandığı için orada sorun yoktu, hata bu yüzden geç fark edildi).
                protocol: "https",
                hostname: "images.igdb.com",
                pathname: "/igdb/image/**",
            },
            {
                // Steam mağaza görselleri (header_image). Steam birden fazla CDN ana makinesi
                // kullanıyor; hepsi aynı yol şemasını paylaşıyor.
                protocol: "https",
                hostname: "shared.akamai.steamstatic.com",
            },
            {
                protocol: "https",
                hostname: "shared.cloudflare.steamstatic.com",
            },
            {
                protocol: "https",
                hostname: "cdn.akamai.steamstatic.com",
            },
            {
                protocol: "https",
                hostname: "cdn.cloudflare.steamstatic.com",
            },
        ],
    },
    devIndicators: false,
};

export default nextConfig;
