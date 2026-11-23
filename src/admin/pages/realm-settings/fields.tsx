// @ts-nocheck

import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
import {
    Confirm,
    ConfirmAction,
    ConfirmCancel,
    ConfirmContent,
    ConfirmDescription,
    ConfirmFooter,
    ConfirmHeader,
    ConfirmTitle
} from "@ui/patterns/confirm";
import { Children, Fragment, isValidElement, useId } from "react";
import { useT } from "../../ui/i18n";
import { GROUP, SEPARATOR } from "../../ui/kit";

export const DANGER_BTN =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

export function ConfirmDialog({ opts, onClose }: any) {
    const t = useT();
    return (
        <Confirm open={!!opts} onOpenChange={(o: boolean) => !o && onClose()}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = opts?.onConfirm;
                            onClose();
                            fn?.();
                        }}
                    >
                        {opts?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
}

export function SaveBar({ onClick, saving, disabled, label, className }: any) {
    const t = useT();
    return (
        <div className={`flex justify-end ${className ?? ""}`}>
            <Button type="button" size="form" onClick={onClick} disabled={saving || disabled}>
                {saving ? t("sxRealmSettingsSaving") : (label ?? t("sxRealmSettingsSave"))}
            </Button>
        </div>
    );
}

export function Footnote({ children }: any) {
    return <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">{children}</p>;
}

export function ErrorNote({ children }: any) {
    return (
        <p className="mt-2 px-0.5 text-[13px] text-[#d70015] [overflow-wrap:anywhere] dark:text-[#ff453a]">
            {children}
        </p>
    );
}

function flatten(children: any): any[] {
    return Children.toArray(children).flatMap((c: any) =>
        isValidElement(c) && c.type === Fragment ? flatten(c.props.children) : [c]
    );
}

export function Card({ children }: any) {
    const segments: { field: boolean; items: any[] }[] = [];
    flatten(children).forEach(item => {
        const field = isValidElement(item) && !!(item.type as any)?.isField;
        const last = segments[segments.length - 1];
        if (field && last?.field) last.items.push(item);
        else segments.push({ field, items: [item] });
    });
    return (
        <div className={GROUP}>
            {segments.map((segment, index) => (
                <Fragment key={index}>
                    {index > 0 && <div aria-hidden className={SEPARATOR} />}
                    {segment.field ? (
                        <div className="grid gap-4 p-4 sm:grid-cols-2">{segment.items}</div>
                    ) : (
                        segment.items
                    )}
                </Fragment>
            ))}
        </div>
    );
}

export function ToggleRow({ label, hint, checked, onChange, disabled }: any) {
    const id = useId();
    return (
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <label htmlFor={id} className="min-w-0 cursor-pointer">
                <span className="block text-base">{label}</span>
                {hint && (
                    <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {hint}
                    </span>
                )}
            </label>
            <Switch
                id={id}
                checked={!!checked}
                onCheckedChange={(v: boolean) => onChange(v)}
                disabled={disabled}
            />
        </div>
    );
}

export function ActionRow({ label, hint, children }: any) {
    return (
        <div className="flex min-h-14 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <span className="block text-base">{label}</span>
                {hint && (
                    <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {hint}
                    </span>
                )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}

export function InfoRow({ label, children }: any) {
    return (
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-base">{label}</span>
            <span className="min-w-0 text-end">{children}</span>
        </div>
    );
}

export function FieldItem({ label, hint, wide, htmlFor, children }: any) {
    return (
        <Field size="lg" className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
            {label && <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>}
            {children}
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
        </Field>
    );
}
FieldItem.isField = true;

export function TextField({ label, hint, value, onChange, placeholder, type, mono, wide }: any) {
    const id = useId();
    return (
        <FieldItem label={label} hint={hint} wide={wide} htmlFor={id}>
            <Input
                id={id}
                size="lg"
                type={type}
                className={mono ? "font-mono data-[size=lg]:text-[15px]" : undefined}
                value={value ?? ""}
                onChange={(ev: any) => onChange(ev.target.value)}
                placeholder={placeholder}
            />
        </FieldItem>
    );
}
TextField.isField = true;

export function NumField({ label, v, on, unit, hint: extra }: any) {
    const t = useT();
    const id = useId();
    const hint = extra ?? (unit === undefined ? t("sxRealmSettingsSeconds") : unit);
    return (
        <FieldItem label={label} hint={hint || undefined} htmlFor={id}>
            <Input
                id={id}
                size="lg"
                type="number"
                className="tabular-nums"
                value={v ?? ""}
                onChange={(ev: any) => on(ev.target.value)}
                placeholder="0"
            />
        </FieldItem>
    );
}
NumField.isField = true;

export function ChoiceField({ label, value, onChange, options, hint, wide }: any) {
    const t = useT();
    const id = useId();
    const normalized = options.map((o: any) => (typeof o === "string" ? { value: o, label: o } : o));
    const known = normalized.some((o: any) => o.value === value);
    return (
        <FieldItem label={label} htmlFor={id} hint={hint} wide={wide}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                value={value ?? ""}
                onChange={(ev: any) => onChange(ev.target.value)}
            >
                {(value === undefined || value === "") && (
                    <NativeSelectOption value="" disabled>
                        {t("sxRealmSettingsSelect")}
                    </NativeSelectOption>
                )}
                {!known && value !== undefined && value !== "" && (
                    <NativeSelectOption value={value}>{value}</NativeSelectOption>
                )}
                {normalized.map((o: any) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FieldItem>
    );
}
ChoiceField.isField = true;

export function ThemeField({ label, value, options, onChange }: any) {
    const t = useT();
    const id = useId();
    const list = options || [];
    return (
        <FieldItem label={label} htmlFor={id}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                value={value || ""}
                onChange={(ev: any) => onChange(ev.target.value)}
            >
                <NativeSelectOption value="">{t("sxRealmSettingsDefaultTheme")}</NativeSelectOption>
                {value && !list.includes(value) && (
                    <NativeSelectOption value={value}>{value}</NativeSelectOption>
                )}
                {list.map((o: string) => (
                    <NativeSelectOption key={o} value={o}>
                        {o}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FieldItem>
    );
}
ThemeField.isField = true;

export function ChipMulti({ selected, options, onChange, placeholder }: any) {
    const t = useT();
    const available = (options || []).filter((o: string) => !selected.includes(o));
    const remove = (v: string) => onChange(selected.filter((x: string) => x !== v));
    const add = (v: string) => {
        if (v && !selected.includes(v)) onChange([...selected, v]);
    };
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {selected.length === 0 && (
                    <span className="ps-0.5 text-[15px] text-muted-foreground">
                        {t("sxRealmSettingsNoneSelected")}
                    </span>
                )}
                {selected.map((v: string) => (
                    <span
                        key={v}
                        className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#d2d2d7] bg-background ps-2.5 pe-1 text-[13px] dark:border-[#48484a] dark:bg-transparent"
                    >
                        <span className="truncate font-mono">{v}</span>
                        <button
                            type="button"
                            onClick={() => remove(v)}
                            aria-label={t("sxRealmSettingsRemoveValue", { value: v })}
                            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/10"
                        >
                            <XIcon className="size-3" />
                        </button>
                    </span>
                ))}
            </div>
            {available.length > 0 && (
                <NativeSelect
                    size="lg"
                    className="w-full"
                    aria-label={placeholder}
                    value=""
                    onChange={(ev: any) => add(ev.target.value)}
                >
                    <NativeSelectOption value="" disabled>
                        {placeholder}
                    </NativeSelectOption>
                    {available.map((o: string) => (
                        <NativeSelectOption key={o} value={o}>
                            {o}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            )}
        </div>
    );
}

export function localeName(code: string, lang?: string) {
    try {
        const dn = new (Intl as any).DisplayNames([lang || "en"], { type: "language" });
        const name = dn.of(String(code).replace("_", "-"));
        return name && name !== code ? `${name} (${code})` : code;
    } catch {
        return code;
    }
}

export function downloadJson(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
