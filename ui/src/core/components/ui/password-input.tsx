"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/core/components/ui/input";
import { useI18n } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";

/**
 * Sifre alani + gorunurluk dugmesi (goz). Input ile ayni props'u alir; sag tarafta
 * dugme icin pr-10 birakir. Sol ikon (Lock) cagiran tarafta kalir.
 */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
    const t = useI18n();
    const [visible, setVisible] = React.useState(false);
    const label = visible ? t("auth.hidePassword") : t("auth.showPassword");

    return (
        <>
            <Input type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={label}
                title={label}
                aria-pressed={visible}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </>
    );
}
