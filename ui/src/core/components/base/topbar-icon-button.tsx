"use client";

import React from "react";
import { cn } from "@/core/lib/utils";

type TopbarIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: React.ComponentType<{ className?: string }>;
    /** Okunmamis sayisi; 0 ya da bos ise rozet cizilmez, 99 ustu "99+". */
    badge?: number;
    /** Popover acikken vurgulu. */
    active?: boolean;
    label: string;
};

/**
 * Ust cubuktaki yuvarlak ikon dugmesi (bildirim zili, mesajlar). Iki dugme ayni gorunumu ve rozeti
 * paylassin diye tek yerde. PopoverTrigger asChild ile kullanilir: ref ve olay baglayicilari gecer.
 */
export const TopbarIconButton = React.forwardRef<HTMLButtonElement, TopbarIconButtonProps>(
    ({ icon: Icon, badge, active, label, className, ...props }, ref) => {
        const count = badge ?? 0;
        return (
            <button
                ref={ref}
                type="button"
                aria-label={label}
                {...props}
                className={cn(
                    "relative flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                    active && "bg-accent text-foreground",
                    className,
                )}
            >
                <Icon className="size-5" />
                {count > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
                        {count > 99 ? "99+" : count}
                    </span>
                ) : null}
            </button>
        );
    },
);
TopbarIconButton.displayName = "TopbarIconButton";
