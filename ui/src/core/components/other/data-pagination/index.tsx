import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink, PaginationEllipsis } from "@core/components/ui/pagination";
import { DOTS, usePagination } from "@core/hooks/use-pagination";
import { useI18n } from "@/core/contexts/locale-context";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataPaginationProps {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    siblingCount?: number;
}

/**
 * Metinler ve etiketler arayuz dilinde. Onceden "Onceki/Sonraki" sabit Turkceydi (Ingilizce sayfada
 * da) ve aria-label Ingilizceydi. Liste yapisi: <ul> altinda yalniz <li> (Lighthouse "list");
 * sayfa numaralari masaustunde, "3 / 10" gostergesi telefonda gorunur.
 */
export function DataPagination({ page, pageSize, totalCount, onPageChange, siblingCount = 1 }: DataPaginationProps) {
    const t = useI18n();
    const paginationRange = usePagination({
        currentPage: page,
        totalCount,
        siblingCount,
        pageSize,
    });

    if (page === 0 || paginationRange.length < 2) {
        return null;
    }

    const onNext = () => onPageChange(page + 1);
    const onPrevious = () => onPageChange(page - 1);

    let lastPage = paginationRange[paginationRange.length - 1];
    const isFirst = page === 1;
    const isLast = page === lastPage;

    return (
        <Pagination aria-label={t("common.pagination")}>
            <PaginationContent className="flex-wrap gap-1">
                <PaginationItem>
                    <PaginationPrevious
                        onClick={onPrevious}
                        disabled={isFirst}
                        aria-label={t("common.previousPage")}
                        className={isFirst ? undefined : "cursor-pointer"}
                    >
                        {/* Mobilde sadece icon */}
                        <span className="hidden sm:inline">{t("common.previous")}</span>
                        <ChevronLeft aria-hidden className="h-4 w-4 sm:hidden" />
                    </PaginationPrevious>
                </PaginationItem>

                {/* Sayfa numaralari: mobilde gizli */}
                {paginationRange.map((pageNumber, index) => {
                    if (pageNumber === DOTS) {
                        return (
                            <PaginationItem key={`dots-${index}`} className="hidden sm:block">
                                <PaginationEllipsis label={t("common.morePages")} />
                            </PaginationItem>
                        );
                    }
                    const isActive = pageNumber === page;
                    return (
                        <PaginationItem key={`page-${pageNumber}`} className="hidden sm:block">
                            <PaginationLink
                                isActive={isActive}
                                onClick={() => onPageChange(pageNumber as number)}
                                aria-label={t("common.goToPage", { page: pageNumber })}
                                className="cursor-pointer"
                            >
                                {pageNumber}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}

                {/* Mobilde sadece mevcut sayfa */}
                <PaginationItem className="flex items-center px-3 py-1 text-sm sm:hidden">
                    <span className="font-medium">{page}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-muted-foreground">{lastPage}</span>
                </PaginationItem>

                <PaginationItem>
                    <PaginationNext
                        onClick={onNext}
                        disabled={isLast}
                        aria-label={t("common.nextPage")}
                        className={isLast ? undefined : "cursor-pointer"}
                    >
                        {/* Mobilde sadece icon */}
                        <span className="hidden sm:inline">{t("common.next")}</span>
                        <ChevronRight aria-hidden className="h-4 w-4 sm:hidden" />
                    </PaginationNext>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
