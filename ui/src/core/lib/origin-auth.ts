/**
 * Origin kilidi: Railway'e Cloudflare'i atlayarak gelen istekleri reddeder.
 *
 * Neden: Railway'in kenar sunuculari Host basligina gore yonlendiriyor. `curl --resolve
 * pausemenu.app:443:<railway-ip>` ile Cloudflare'in onbellegi, kurallari ve hiz siniri tamamen
 * atlanabiliyordu (22 Kas 2026'da dogrulandi). Cloudflare her istege bir Transform Rule ile gizli
 * bir baslik ekler; baslik yoksa istek Cloudflare'den gelmemistir.
 *
 * Basarisizlikta ACIK: ORIGIN_AUTH_SECRET tanimli degilse kilit kapali, davranis eskisi gibi.
 * Acilis sirasi: 1) bu kod deploy edilir, 2) Cloudflare kurali eklenir, 3) basligin geldigi
 * dogrulanir, 4) Railway'de ORIGIN_AUTH_SECRET (web ve api ayni deger) tanimlanir.
 *
 * Sunucudan API'ye giden istekler (serverGet, /api/track) ayni basligi kendisi ekler: API_BASE_URL
 * ic ag adresi de olsa Cloudflare adresi de olsa kilitten gecer.
 */
export const ORIGIN_AUTH_HEADER = "x-origin-auth";

export const getOriginAuthSecret = () => process.env.ORIGIN_AUTH_SECRET || "";

/** Sunucudan API'ye giden fetch basliklarina eklenir; sir tanimli degilse bos nesne. */
export const originAuthHeaders = (): Record<string, string> => {
    const secret = getOriginAuthSecret();
    return secret ? { [ORIGIN_AUTH_HEADER]: secret } : {};
};

/**
 * Istek kilitten gecer mi? Host'suz istekler (Next'in gorsel optimizer'inin yerel dosya icin
 * actigi sahte istek) ve Railway saglik kontrolu muaf: Railway kenari Host'suz ya da baska bir
 * Host'la gelen istegi bu servise yonlendiremez, yani muafiyet disaridan kullanilamaz.
 */
export const isOriginAllowed = (headers: Headers): boolean => {
    const secret = getOriginAuthSecret();
    if (!secret) return true;

    const host = (headers.get("host") ?? "").toLowerCase();
    if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1") || host === "healthcheck.railway.app" || host.endsWith(".railway.internal")) {
        return true;
    }

    return headers.get(ORIGIN_AUTH_HEADER) === secret;
};

/**
 * Telemetri tuzu ve ingest anahtari: ayri degiskenler (VISITOR_HASH_SALT, DOWNLOAD_ANALYTICS_INGEST_KEY)
 * tanimli degilse ORIGIN_AUTH_SECRET kullanilir. 22 Kas 2026'da ikisi de Railway'de yoktu: tuz repodaki
 * herkese acik varsayilandi, collect uclari anahtarsizdi. Tek sir girilince ucu de kapanir. Tarayici bu
 * degeri goremez: Cloudflare yalniz x-origin-auth basligini ekler, X-Ingest-Key'i yalniz sunucu yazar.
 */
export const getVisitorHashSalt = () => process.env.VISITOR_HASH_SALT || getOriginAuthSecret() || "pm-dev-salt";

export const getIngestKey = () => process.env.DOWNLOAD_ANALYTICS_INGEST_KEY || getOriginAuthSecret();
