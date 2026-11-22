import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/core/lib/utils"
import { Button, buttonVariants } from "@/core/components/ui/button"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

/**
 * Sayfalama ogeleri <button>. Onceden href'siz <a> idi: Lighthouse "taranamaz link" (SEO) ve
 * href'siz a uzerinde aria-label yasak (erisilebilirlik) diyordu. Gercek ?page= href'i botlara
 * binlerce yeni URL acacagi icin (bot maliyeti) dugme secildi. Gorunum ayni: buttonVariants.
 */
type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"button">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  type = "button",
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type={type}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

/** Varsayilan icerik ve etiket Ingilizce; cagiran yer dile gore children ve aria-label verir. */
function PaginationPrevious({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      {children ?? (
        <>
          <ChevronLeftIcon />
          <span className="hidden sm:block">Previous</span>
        </>
      )}
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      {children ?? (
        <>
          <span className="hidden sm:block">Next</span>
          <ChevronRightIcon />
        </>
      )}
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  label = "More pages",
  ...props
}: React.ComponentProps<"span"> & { label?: string }) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
