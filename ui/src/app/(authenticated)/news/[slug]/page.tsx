import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsDetailView } from "@/core/components/other/news/news-detail-view";
import { getNewsDetailServer, getNewsFirstPageServer } from "@/api/news/news.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, newsArticleJsonLd } from "@/core/seo/json-ld";
import { truncate } from "@/core/seo/text";
import { getGameImageUrl } from "@/core/lib/get-image-url";
import type { NewsDetail } from "@/models/news/news.model";

type Props = { params: Promise<{ slug: string; locale?: string }> };

const SLUG_PATTERN = /^[a-z0-9-]{3,160}$/;

const coverOf = (article: NewsDetail) =>
    article.imageKind === "catalog" ? (getGameImageUrl(article.imageUrl, 1280) ?? null) : article.imageUrl;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: article, status } = SLUG_PATTERN.test(slug) ? await getNewsDetailServer(slug) : { data: null, status: 404 };

    if (!article) {
        // generateMetadata icinde notFound(): yanit GERCEK 404 olur (loading kabugu gonderilmeden once).
        if (status === 404) notFound();
        return { title: seoCopy(locale, "siteTitle") };
    }

    const title = locale === "tr" ? article.titleTr : article.titleEn;
    const summary = locale === "tr" ? article.summaryTr : article.summaryEn;
    const cover = coverOf(article);

    return buildPageMetadata({
        locale,
        path: `/news/${article.slug}`,
        title,
        description: truncate(summary, 160),
        image: cover ? { url: cover, alt: title } : null,
        type: "article",
        publishedTime: article.publishedAt,
        modifiedTime: article.publishedAt,
    });
}

export default async function NewsDetailPage({ params }: Props) {
    const { slug } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: article, status } = SLUG_PATTERN.test(slug) ? await getNewsDetailServer(slug) : { data: null, status: 404 };

    if (!article) {
        if (status === 404) notFound();
        throw new Error("news unavailable");
    }

    const messages = getMessages(locale);
    const title = locale === "tr" ? article.titleTr : article.titleEn;
    // Sag sutundaki son haberler: liste sayfasiyla ayni onbellekli istek (ek API yuku yok).
    const latest = (await getNewsFirstPageServer()).data?.items ?? [];

    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <JsonLd
                data={[
                    newsArticleJsonLd({
                        locale,
                        path: `/news/${article.slug}`,
                        headline: title,
                        description: locale === "tr" ? article.summaryTr : article.summaryEn,
                        image: coverOf(article),
                        datePublished: article.publishedAt,
                        sources: article.sources.map((s) => ({ name: s.name, url: s.url })),
                    }),
                    breadcrumbJsonLd(locale, [
                        { name: translate(messages, "nav.home"), path: "/" },
                        { name: translate(messages, "nav.news"), path: "/news" },
                        { name: title, path: `/news/${article.slug}` },
                    ]),
                ]}
            />
            <NewsDetailView article={article} latest={latest} />
        </div>
    );
}
