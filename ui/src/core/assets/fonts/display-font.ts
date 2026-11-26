import { Shrikhand } from "next/font/google";

/**
 * Tanitim basliklari icin karakterli gosterim fontu (Shrikhand, SIL OFL). Turkce harflerin
 * tamami (ğ Ğ ı İ ş Ş) var.
 *
 * display "block": Google fontu latin ve latin-ext olarak iki dosyaya boluyor. "optional"
 * gosterimde biri ilk boyaya yetisip digeri yetismezse ş/ğ/İ yedek fonttan ciziliyor ve baslik
 * bozuk gorunuyordu (sitede Inter icin yasanan durum). "block" ile bir harfin dosyasi gelene kadar
 * o harf bos kalir, sonra dogru fontla cizilir; iki fontun karistigi bir son durum olmaz.
 * Iki dosya da on yuklenir (preload), kucuktur; "swap" gibi sonradan buyuyup yeni LCP girdisi
 * yazdirmaz.
 */
export const displayFont = Shrikhand({
    weight: "400",
    subsets: ["latin", "latin-ext"],
    display: "block",
});
