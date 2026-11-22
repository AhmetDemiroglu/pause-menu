import { Skeleton } from "@/core/components/ui/skeleton";
import { NewsGridSkeleton } from "@/core/components/other/news/news-view";

export default function NewsLoading() {
    return (
        <div className="h-full w-full space-y-6 p-5">
            <div className="space-y-3">
                <Skeleton className="h-9 w-72 rounded-lg" />
                <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <Skeleton className="h-9 w-full max-w-2xl rounded-lg" />
            <NewsGridSkeleton />
        </div>
    );
}
