import type { Metadata } from "next";
import { NewsView } from "@/core/components/other/news/news-view";
import { getNewsFirstPageServer } from "@/api/news/news.server";
import { resolveLocaleFromParams } from "@/i18n/server";
import { staticPageMetadata } from "@/core/seo/page-metadata";
import { getMessages, translate } from "@/i18n";
import { seoCopy } from "@/core/seo/copy";
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from "@/core/seo/json-ld";
import { getGameImageUrl } from "@/core/lib/get-image-url";

type Props = { params?: Promise<{ locale?: string }> };

export const generateMetadata: (props: Props) => Promise<Metadata> = staticPageMetadata("/news", "news");

/**
 * Oyun dunyasindan haberler. Ilk sayfa sunucuda cekilir ve HTML'e gomulur: Googlebot API'ye gitmeden
 * icerigi gorur (api alan adi robots ile kapali). Kategoriler ve sonraki sayfalar istemcide.
 */
export default async function NewsPage({ params }: Props) {
    const locale = await resolveLocaleFromParams(params);
    const firstPage = (await getNewsFirstPageServer()).data;
    const messages = getMessages(locale);

    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            {firstPage?.items.length ? (
                <JsonLd
                    data={[
                        collectionPageJsonLd({
                            locale,
                            path: "/news",
                            name: seoCopy(locale, "newsTitle"),
                            description: seoCopy(locale, "newsDescription"),
                            items: firstPage.items.map((item) => ({
                                name: locale === "tr" ? item.titleTr : item.titleEn,
                                path: `/news/${item.slug}`,
                                image: item.imageKind === "catalog" ? (getGameImageUrl(item.imageUrl, 640) ?? null) : item.imageUrl,
                            })),
                        }),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: translate(messages, "nav.news"), path: "/news" },
                        ]),
                    ]}
                />
            ) : null}
            <NewsView initialFirstPage={firstPage} />
        </div>
    );
}
