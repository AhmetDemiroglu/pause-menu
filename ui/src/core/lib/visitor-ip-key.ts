import { createHash } from "crypto";
import { getVisitorHashSalt } from "@/core/lib/origin-auth";

/**
 * Telemetri hiz siniri anahtari: yalniz IP'nin gunluk tuzlu hash'i. X-Visitor-Hash IP + UA
 * icerdigi icin her istekte UA degistiren biri her seferinde yeni bir kova aciyor ve olay
 * tablolarina sinirsiz satir yazdirabiliyordu. Ham IP backend'e yine gitmez.
 */
export function visitorIpKey(ip: string): string {
    const salt = getVisitorHashSalt();
    const day = new Date().toISOString().slice(0, 10);
    return createHash("sha256").update(`ip|${salt}|${day}|${ip}`).digest("hex").slice(0, 32);
}
