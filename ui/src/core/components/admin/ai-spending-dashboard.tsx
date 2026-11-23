"use client";

import { Coins } from "lucide-react";
import type { AiSettings, AiUsageReport } from "@/models/admin/ai-admin.model";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { StatsCard } from "./stats-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/core/components/ui/table";

export function AiSpendingDashboard({ report, settings, appliedSettings, onChange, onSave, saving }: {
    report?: AiUsageReport; settings: AiSettings; appliedSettings: AiSettings; onChange: (settings: AiSettings) => void; onSave: () => void; saving: boolean;
}) {
    const tr = useCurrentLocale() === "tr";
    const text = (a: string, b: string) => tr ? a : b;
    const money = (value: number) => new Intl.NumberFormat(tr ? "tr-TR" : "en-US", { style: "currency", currency: "TRY" }).format(value);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const budgets = report?.budgets ?? [];
    const daily = report?.daily ?? [];
    const total = budgets.reduce((n, b) => n + b.spentTry, 0);
    const todayTotal = budgets.reduce((n, b) => n + b.spentTodayTry, 0);
    const groups = [
        { key: "translation", label: text("Oyun açıklaması çevirisi", "Game description translation"), limit: settings.translationMonthlyBudgetTry },
        { key: "ai-agent", label: text("Sosyal botlar", "Social bots"), limit: settings.agentMonthlyBudgetTry },
        { key: "news-text", label: text("Haber metni (TR + EN)", "News text (TR + EN)"), limit: settings.newsMonthlyBudgetTry },
        { key: "news-image", label: text("Haber görsel üretimi", "News image generation"), limit: settings.newsMonthlyBudgetTry },
    ];
    const category = (source: string, model: string) => source === "news" ? (model.endsWith("-image") ? "news-image" : "news-text") : source;
    const cost = (key: string, day?: string) => daily.filter(r => category(r.source, r.model) === key && (day ? r.day === day : r.day.startsWith(month))).reduce((n, r) => n + r.spentTry, 0);
    const days = [...new Set([...daily.map(r => r.day), ...(report?.newsProduction ?? []).map(r => r.day)])].sort().reverse();
    const stopReason = appliedSettings.generationPaused ? text("Tüm AI üretimi duraklatıldı", "All AI generation paused")
        : appliedSettings.totalMonthlyBudgetTry != null && total >= appliedSettings.totalMonthlyBudgetTry ? text("Aylık toplam sınıra ulaşıldı", "Monthly total limit reached")
        : appliedSettings.totalDailyBudgetTry != null && todayTotal >= appliedSettings.totalDailyBudgetTry ? text("Günlük toplam sınıra ulaşıldı", "Daily total limit reached")
        : text("Üretim kendi kaynak ayarlarına göre çalışır", "Generation follows each source's settings");
    const limitField = (key: "totalMonthlyBudgetTry" | "totalDailyBudgetTry", label: string) => (
        <div className="min-w-0 space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} type="number" min="0" step="0.01" value={settings[key] ?? ""}
                placeholder={text("Ek sınır yok", "No additional limit")}
                onChange={e => onChange({ ...settings, [key]: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
    );
    return <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
            <StatsCard title={text("Bu ay toplam harcama", "Total spent this month")} icon={Coins} value={report ? money(total) : "-"}
                description={text("Çeviri + sosyal botlar + haber metni + görseller", "Translation + social bots + news text + images")} />
            <StatsCard title={text("Bugün toplam harcama", "Total spent today")} icon={Coins} value={report ? money(todayTotal) : "-"}
                description={text("Gün sınırı: UTC 00:00 (Türkiye 03:00)", "Day boundary: 00:00 UTC")} />
            <StatsCard title={text("Aylık toplam kalan", "Monthly total remaining")} icon={Coins}
                value={!report ? "-" : appliedSettings.totalMonthlyBudgetTry == null ? text("Ek sınır yok", "No additional limit") : money(Math.max(0, appliedSettings.totalMonthlyBudgetTry - total))}
                description={text("Kaynaklara özel tavanlar ayrıca uygulanır", "Individual source caps also apply")} />
        </div>
        <Card>
            <CardHeader><CardTitle>{text("Harcama dağılımı", "Spending breakdown")}</CardTitle>
                <CardDescription>{text("Haber harcaması oyun çevirisine dahil değildir. Haber metni ve görselleri aynı haber tavanını paylaşır. Tutarlar token kullanımı, tanımlı model fiyatı ve seçili kurla hesaplanır; sağlayıcı faturası değildir.", "News is separate from game translation. News text and images share the news cap. Costs are calculated from token usage, configured model prices and exchange rate, not the provider invoice.")}</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow>
                <TableHead>{text("İşlem", "Activity")}</TableHead><TableHead>{text("Bugün", "Today")}</TableHead><TableHead>{text("Bu ay harcanan", "Spent this month")}</TableHead><TableHead>{text("Aylık tavan", "Monthly cap")}</TableHead>
            </TableRow></TableHeader><TableBody>{groups.map(g => <TableRow key={g.key}>
                <TableCell className="font-medium">{g.label}</TableCell><TableCell>{report ? money(cost(g.key, today)) : "-"}</TableCell><TableCell>{report ? money(cost(g.key)) : "-"}</TableCell><TableCell>{money(g.limit)}{g.key.startsWith("news") ? text(" (ortak)", " (shared)") : ""}</TableCell>
            </TableRow>)}</TableBody></Table></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>{text("Toplam bütçe ve durdurma", "Total budget and stop control")}</CardTitle><CardDescription>{stopReason}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">{limitField("totalMonthlyBudgetTry", text("Aylık toplam tavan (TL)", "Monthly total cap (TRY)"))}{limitField("totalDailyBudgetTry", text("Günlük toplam tavan (TL)", "Daily total cap (TRY)"))}</div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><Label htmlFor="generation-paused">{text("Tüm AI üretimini duraklat", "Pause all AI generation")}</Label><Switch id="generation-paused" checked={settings.generationPaused ?? false} onCheckedChange={v => onChange({ ...settings, generationPaused: v })} /></div>
                <p className="text-sm text-muted-foreground">{text("Boş alan ek sınır koymaz; 0 üretimi durdurur. Sınıra ulaşınca ücretsiz modeller dahil yeni AI çağrıları durur. Günlük sınır yeni UTC gününde, aylık sınır yeni ayda açılır. Kaydet ile uygulanır. Başlamış çağrılar tamamlanabilir ve son tutar sınırı bir miktar aşabilir.", "Blank adds no extra cap; 0 stops generation. Reaching a cap blocks new AI calls, including free models. Daily and monthly caps reset at the next UTC day or month. Save to apply. Calls already in progress may finish and slightly exceed the cap.")}</p>
                <Button onClick={onSave} disabled={saving || [settings.totalMonthlyBudgetTry, settings.totalDailyBudgetTry].some(v => v != null && (!Number.isFinite(v) || v < 0))}>{saving ? text("Kaydediliyor...", "Saving...") : text("Bütçe ve durdurma ayarlarını kaydet", "Save budget and stop settings")}</Button>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>{text("Günlük maliyet ve ilk dolum", "Daily costs and initial import")}</CardTitle>
                <CardDescription>{text("İlk dolum tek seferliktir; günlük gider tahmini değildir. Eski harcamalarda ilk dolum ve görsel onarım ayrı etiketlenmediği için kesin maliyetleri ayrıştırılamaz. Aşağıdaki ilk dolum sayısı o gün eklenen haberlerdir; görsel çağrıları eski haber onarımlarını da içerir. Günler UTC'dir.", "The initial import is a one-off, not a daily forecast. Historical import and image repair costs were not tagged separately and cannot be split exactly. Initial import counts show articles added that day; image calls also include repairs to older articles. Days use UTC.")}</CardDescription></CardHeader>
            <CardContent><div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow>
                {[text("Gün", "Day"),text("Toplam", "Total"),text("Çeviri", "Translation"),text("Sosyal bot", "Social bot"),text("Haber metni", "News text"),text("Haber görseli", "News images"),text("Görsel çağrısı", "Image calls"),text("İlk dolum / Normal haber", "Import / Regular articles")].map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
            </TableRow></TableHeader><TableBody>{days.map(day => { const production = report?.newsProduction?.find(p => p.day === day); return <TableRow key={day}>
                <TableCell className="whitespace-nowrap">{day}</TableCell><TableCell className="whitespace-nowrap font-semibold">{money(daily.filter(r => r.day === day).reduce((n,r) => n+r.spentTry,0))}</TableCell>
                {groups.map(g => <TableCell key={g.key} className="whitespace-nowrap">{money(cost(g.key, day))}</TableCell>)}
                <TableCell>{daily.filter(r => r.day === day && category(r.source,r.model) === "news-image").reduce((n,r) => n+r.callCount,0)}</TableCell><TableCell>{production?.backfill ?? 0} / {production?.regular ?? 0}</TableCell>
            </TableRow>; })}{!days.length && <TableRow><TableCell colSpan={8}>{text("Harcama kaydı yok.", "No usage records.")}</TableCell></TableRow>}</TableBody></Table></div></CardContent>
        </Card>
    </div>;
}
