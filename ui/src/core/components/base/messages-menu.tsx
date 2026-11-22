"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import { Mail } from "lucide-react";
import { useNavigationData, useRecentMessages } from "@/core/hooks/use-navigation-data";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { UserLink } from "@/core/components/base/user-link";
import { TopbarIconButton } from "@/core/components/base/topbar-icon-button";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";

dayjs.extend(relativeTime);

/**
 * Ust cubuktaki mesajlar dugmesi (masaustu). Eskiden kenar cubugundaydi; menuye yeni sayfa
 * eklendikce cubuk kucuk ekranlarda kaymaya basliyordu. Mobil web'de mesajlar menude kalir.
 */
export function MessagesMenu({ className }: { className?: string }) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();
    const { unreadMsgCount } = useNavigationData();
    const [open, setOpen] = useState(false);
    const { data: recentMessages } = useRecentMessages(open);

    useEffect(() => {
        dayjs.locale(locale === "tr" ? "tr" : "en");
    }, [locale]);

    const close = () => setOpen(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <TopbarIconButton icon={Mail} label={t("nav.messages")} badge={unreadMsgCount?.count} active={open} className={className} />
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="end"
                sideOffset={10}
                collisionPadding={12}
                className="w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl p-0 shadow-[0_24px_60px_-20px_rgba(8,10,24,0.45)]"
            >
                <div className="border-b p-3">
                    <h3 className="font-semibold">{t("nav.messagesTitle")}</h3>
                </div>
                <div className="max-h-[min(60vh,20rem)] overflow-y-auto">
                    {recentMessages?.length ? (
                        recentMessages.slice(0, 5).map((conversation) => {
                            // ConversationDto ad/soyad tasimiyor; displayName() username'e duser.
                            // Gercek ad + isProfileAccessible icin tam UserDto; eski yanitlarda duz alanlara duseriz.
                            const partner = conversation.partner ?? {
                                username: conversation.partnerUsername,
                                profileImageUrl: conversation.partnerProfileImageUrl,
                            };

                            return (
                                // Satiri kaplayan link: thread'e gider; avatar/ad z-20 ile ustte kalip profile gider.
                                <div key={conversation.partnerId} className="relative border-b p-3 hover:bg-accent">
                                    <Link
                                        href={localizeHref(`/messages/${conversation.partnerUsername}`)}
                                        className="absolute inset-0 z-10 cursor-pointer"
                                        aria-label={t("nav.messagesTitle")}
                                        onClick={close}
                                    />
                                    <div className="flex items-center gap-3">
                                        <UserLink
                                            user={partner}
                                            variant="avatar"
                                            className="relative z-20 shrink-0"
                                            avatarClassName="h-9 w-9"
                                            avatarFallback={conversation.partnerUsername.charAt(0).toUpperCase()}
                                            onNavigate={close}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex items-center justify-between">
                                                <UserLink
                                                    user={partner}
                                                    variant="name"
                                                    className="relative z-20 truncate text-sm font-semibold hover:underline"
                                                    onNavigate={close}
                                                />
                                                {conversation.unreadCount > 0 && (
                                                    <Badge variant="default" className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center p-0 text-xs">
                                                        {conversation.unreadCount}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{dayjs(conversation.lastMessageSentAt).fromNow()}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">{t("nav.noMessages")}</div>
                    )}
                </div>
                <div className="border-t p-2">
                    <Button variant="ghost" className="w-full text-sm" asChild>
                        <Link href={localizeHref("/messages")} onClick={close}>
                            {t("nav.viewAllMessages")}
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
