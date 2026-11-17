"use client";

import { Lock } from "lucide-react";
import { Button } from "@core/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/core/contexts/locale-context";

interface UnauthorizedAccessProps {
    title?: string;
    description?: string;
}

export function UnauthorizedAccess({ title, description }: UnauthorizedAccessProps) {
    const t = useI18n();
    const router = useRouter();

    const handleLogin = () => {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/login?returnUrl=${returnUrl}`);
    };

    return (
        <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center space-y-6 pt-4 mt-5">
                <div className="flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-6">
                        <Lock className="h-12 w-12 text-destructive" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">{title ?? t("misc.noAccessTitle")}</h2>
                    <p className="text-muted-foreground">{description ?? t("misc.noAccessDescription")}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={handleLogin} className="cursor-pointer">
                        {t("misc.login")}
                    </Button>
                    <Button variant="outline" asChild className="cursor-pointer">
                        <Link href="/register">{t("misc.register")}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}