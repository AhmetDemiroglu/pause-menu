import sharp from "sharp";

/**
 * Gorsel optimizer'in bellegini kisitlar (yalniz Node sunucusunda, instrumentation.ts'den).
 *
 * Neden: Railway RAM'i dakika basina faturaliyor ve web servisi faturanin en buyuk kalemiydi.
 * Yerel olcum (22 Kas 2026): 300 oyun sayfasi tek basina 250 -> 330 MB; 48 gorsel islemi
 * eklenince 521 MB'a cikip bosta 434 MB'ta kaliyordu. Fark sharp/libvips'in islem onbellegi ve
 * is parcacigi tamponlari. Gorseller Cloudflare'de ve Next'in disk onbelleginde zaten tutuldugu
 * icin libvips'in bellek ici islem onbellegi bir kazanc saglamiyor.
 */
sharp.cache(false);
