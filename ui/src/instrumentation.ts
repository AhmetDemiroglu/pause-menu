/**
 * Sunucu acilisinda bir kez calisir (Next instrumentation). Node'a ozel is ayri dosyada:
 * bu dosya edge calisma zamani icin de derlenir ve sharp oraya giremez.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./instrumentation-node");
    }
}
