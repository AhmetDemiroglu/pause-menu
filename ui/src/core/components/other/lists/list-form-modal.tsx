"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/core/contexts/locale-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ListCategory, ListVisibilitySetting, UserList, UserListDetail, UserListForCreation, UserListForUpdate } from "@/models/list/list.model";
import { Button } from "@core/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@core/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@core/components/ui/form";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@core/components/ui/radio-group";
import { Textarea } from "@core/components/ui/textarea";
import { Globe, Lock, Users } from "lucide-react";
import { Loader } from "lucide-react";

type FormSchemaType = { name: string; description?: string; visibility: number; category: number };

interface ListFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: UserListForCreation | UserListForUpdate) => void;
    isPending: boolean;
    defaultValues?: UserList | UserListDetail | null;
}

export function ListFormModal({ isOpen, onClose, onSubmit, isPending, defaultValues }: ListFormModalProps) {
    const t = useI18n();
    const isEditing = !!defaultValues;
    const title = isEditing ? t("listForm.editTitle") : t("listForm.createTitle");
    const description = isEditing ? t("listForm.editDescription") : t("listForm.createDescription");
    const actionLabel = isEditing ? t("listForm.saveChanges") : t("listForm.create");

    const formSchema = useMemo(() => z.object({
        name: z.string().min(3, { message: t("listForm.nameMin") }).max(100, { message: t("listForm.nameMax") }),
        description: z.string().max(500, { message: t("listForm.descriptionMax") }).optional(),
        visibility: z.nativeEnum(ListVisibilitySetting).transform((val) => Number(val)),
        category: z.nativeEnum(ListCategory).transform((val) => Number(val)),
    }), [t]);

    const categoryOptions = useMemo(() => Object.keys(ListCategory)
        .filter((v) => !isNaN(Number(v)))
        .map((key: string) => {
            const label = ListCategory[Number(key) as ListCategory];
            return { value: key, label: label === "Other" ? t("lists.other") : label };
        }), [t]);

    const visibilityOptions = useMemo(() => [
        { value: String(ListVisibilitySetting.Public), label: t("listForm.visibilityPublic"), description: t("listForm.visibilityPublicDesc"), icon: Globe },
        { value: String(ListVisibilitySetting.Followers), label: t("listForm.visibilityFollowers"), description: t("listForm.visibilityFollowersDesc"), icon: Users },
        { value: String(ListVisibilitySetting.Private), label: t("listForm.visibilityPrivate"), description: t("listForm.visibilityPrivateDesc"), icon: Lock },
    ], [t]);

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultValues?.name || "",
            description: defaultValues?.description || "",
            visibility: defaultValues?.visibility ?? ListVisibilitySetting.Private,
            category: defaultValues?.category ?? ListCategory.Other,
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: defaultValues?.name || "",
                description: defaultValues?.description || "",
                visibility: defaultValues?.visibility ?? ListVisibilitySetting.Private,
                category: defaultValues?.category ?? ListCategory.Other,
            });
        }
    }, [isOpen, defaultValues, form]);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] sm:max-h-[100vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 sm:pr-6 pl-1 py-2 sm:py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Liste Adı */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("listForm.nameLabel")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("listForm.namePlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Açıklama */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("listForm.descriptionLabel")}</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={t("listForm.descriptionPlaceholder")} className="resize-none" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Kategori */}
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("listForm.categoryLabel")}</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("listForm.categoryPlaceholder")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categoryOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Görünürlük */}
                            <FormField
                                control={form.control}
                                name="visibility"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel>{t("listForm.visibilityLabel")}</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)} className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-3">
                                                {visibilityOptions.map((opt) => {
                                                    const Icon = opt.icon;
                                                    const isChecked = String(field.value) === opt.value;
                                                    return (
                                                        <FormItem key={opt.value}>
                                                            <FormLabel
                                                                className={`flex flex-col items-center justify-center rounded-md border p-3 sm:p-4 cursor-pointer transition-colors hover:border-primary ${isChecked ? "border-transparent ring-2 ring-primary" : ""
                                                                    }`}
                                                            >
                                                                <FormControl>
                                                                    <RadioGroupItem value={opt.value} className="sr-only" />
                                                                </FormControl>
                                                                <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                                                                <span>{opt.label}</span>
                                                                <FormDescription className="text-xs text-center mt-1">{opt.description}</FormDescription>
                                                            </FormLabel>
                                                        </FormItem>
                                                    );
                                                })}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="cursor-pointer">
                                    {t("listForm.cancel")}
                                </Button>
                                <Button type="submit" disabled={isPending} className="cursor-pointer">
                                    {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                    {actionLabel}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
