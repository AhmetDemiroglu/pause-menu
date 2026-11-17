"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@core/components/ui/alert-dialog";
import { Button } from "@core/components/ui/button";
import { Loader, Trash2 } from "lucide-react";
import { useI18n } from "@/core/contexts/locale-context";

interface DeleteListDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isPending: boolean;
    listName?: string;
}

export function DeleteListDialog({ isOpen, onClose, onConfirm, isPending, listName }: DeleteListDialogProps) {
    const t = useI18n();
    const [namedBefore, namedAfter] = t("misc.deleteListNamed", { name: "\u0000" }).split("\u0000");
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("misc.deleteListTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {listName ? (
                            <>
                                {namedBefore}<span className="font-semibold">{listName}</span>{namedAfter}
                            </>
                        ) : (
                            t("misc.deleteListUnnamed")
                        )}
                        {" "}{t("misc.irreversible")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose} disabled={isPending} className="cursor-pointer">
                        {t("misc.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isPending} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t("misc.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
