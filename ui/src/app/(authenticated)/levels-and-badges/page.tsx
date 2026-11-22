import { LevelsView } from "@/core/components/other/public/levels-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/levels-and-badges", "levels");

export default function LevelsAndBadgesPage() {
    return <LevelsView />;
}
