// @ts-nocheck

import { CaretDownIcon, CaretRightIcon, CaretUpIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
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
import { cn } from "@ui/lib/utils";
import { Fragment, useId, useState } from "react";
import { useT } from "../../ui/i18n";
import { GROUP, SEPARATOR, TextAction } from "../../ui/kit";

export const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

export function tr(t: any, text: any) {
    if (text === undefined || text === null || text === "") return "";
    const raw = String(text);
    const match = raw.match(/^\$\{(.+)\}$/);
    const key = match ? match[1] : raw;
    return t(key, { defaultValue: match ? key : raw, keySeparator: false });
}

export function ConfirmDialog({ opts, onClose }: any) {
    const t = useT();
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && onClose()}>
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

export function AddLabel({ children }: any) {
    return (
        <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
            <PlusIcon weight="bold" />
            {children}
        </span>
    );
}

export function BackAction({ onClick, children }: any) {
    return (
        <div>
            <TextAction onClick={onClick} className="inline-flex items-center gap-1">
                <CaretRightIcon className="size-3.5 rotate-180 rtl:rotate-0" />
                {children}
            </TextAction>
        </div>
    );
}

export function FormCard({ children, className }: any) {
    return <div className={cn(GROUP, "flex flex-col gap-5 p-4", className)}>{children}</div>;
}

export function FieldItem({ label, hint, error, htmlFor, children, className }: any) {
    return (
        <Field size="lg" className={cn("min-w-0", className)}>
            {label && <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>}
            {children}
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
            {error && <FieldError className="ps-0.5 text-[13px]">{error}</FieldError>}
        </Field>
    );
}

export function TextField({ label, hint, error, value, onChange, placeholder, type, mono, disabled, required }: any) {
    const id = useId();
    return (
        <FieldItem label={label} hint={hint} error={error} htmlFor={id}>
            <Input
                id={id}
                size="lg"
                type={type}
                className={mono ? "font-mono data-[size=lg]:text-[15px]" : undefined}
                value={value ?? ""}
                onChange={(ev: any) => onChange(ev.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-required={required || undefined}
            />
        </FieldItem>
    );
}

export function AreaField({ label, hint, value, onChange, rows = 3, mono, disabled }: any) {
    const id = useId();
    return (
        <FieldItem label={label} hint={hint} htmlFor={id}>
            <Textarea
                id={id}
                rows={rows}
                className={mono ? "font-mono text-xs" : undefined}
                value={value ?? ""}
                onChange={(ev: any) => onChange(ev.target.value)}
                disabled={disabled}
            />
        </FieldItem>
    );
}

export function SelectField({ label, hint, value, onChange, options, disabled, placeholder }: any) {
    const t = useT();
    const id = useId();
    const normalized = (options || []).map((o: any) => (typeof o === "string" ? { value: o, label: o } : o));
    const known = normalized.some((o: any) => o.value === value);
    return (
        <FieldItem label={label} hint={hint} htmlFor={id}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                value={value ?? ""}
                disabled={disabled}
                onChange={(ev: any) => onChange(ev.target.value)}
            >
                {(value === undefined || value === "") && !known && (
                    <NativeSelectOption value="" disabled>
                        {placeholder ?? t("sxCommonSelectPlaceholder")}
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

export function ToggleField({ label, hint, checked, onChange, disabled }: any) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-4">
            <label htmlFor={id} className="min-w-0 cursor-pointer">
                <span className="block text-base">{label}</span>
                {hint && (
                    <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{hint}</span>
                )}
            </label>
            <Switch id={id} checked={!!checked} onCheckedChange={(v: boolean) => onChange(v)} disabled={disabled} />
        </div>
    );
}

export function Pills({ items, onRemove, disabled, mono = true }: any) {
    const t = useT();
    if (!items.length) {
        return <span className="ps-0.5 text-[15px] text-muted-foreground">{t("sxRealmSettingsNoneSelected")}</span>;
    }
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((v: string) => (
                <span
                    key={v}
                    className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#d2d2d7] bg-background ps-2.5 pe-1 text-[13px] dark:border-[#48484a] dark:bg-transparent"
                >
                    <span className={cn("truncate", mono && "font-mono")}>{v}</span>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => onRemove(v)}
                            aria-label={t("sxRealmSettingsRemoveValue", { value: v })}
                            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/10"
                        >
                            <XIcon className="size-3" />
                        </button>
                    )}
                </span>
            ))}
        </div>
    );
}

export function MultiPick({ label, hint, selected, options, onChange, placeholder, disabled }: any) {
    const id = useId();
    const list = Array.isArray(selected) ? selected : [];
    const available = (options || []).filter((o: string) => !list.includes(o));
    return (
        <FieldItem label={label} hint={hint} htmlFor={id}>
            <div className="flex flex-col gap-3">
                <Pills items={list} disabled={disabled} onRemove={(v: string) => onChange(list.filter((x: string) => x !== v))} />
                {!disabled && available.length > 0 && (
                    <NativeSelect
                        id={id}
                        size="lg"
                        className="w-full"
                        value=""
                        onChange={(ev: any) => ev.target.value && onChange([...list, ev.target.value])}
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
        </FieldItem>
    );
}

export function StringList({ label, hint, values, onChange, disabled }: any) {
    const t = useT();
    const id = useId();
    const [draft, setDraft] = useState("");
    const list = Array.isArray(values) ? values : [];
    const add = () => {
        const v = draft.trim();
        if (v && !list.includes(v)) onChange([...list, v]);
        setDraft("");
    };
    return (
        <FieldItem label={label} hint={hint} htmlFor={id}>
            <div className="flex flex-col gap-3">
                <Pills items={list} disabled={disabled} onRemove={(v: string) => onChange(list.filter((x: string) => x !== v))} />
                {!disabled && (
                    <div className="flex items-center gap-2">
                        <Input
                            id={id}
                            size="lg"
                            value={draft}
                            placeholder={t("sxClientPoliciesEditorAddValuePlaceholder")}
                            onChange={(ev: any) => setDraft(ev.target.value)}
                            onKeyDown={(ev: any) => {
                                if (ev.key === "Enter") {
                                    ev.preventDefault();
                                    add();
                                }
                            }}
                            className="min-w-0 flex-1"
                        />
                        <Button type="button" variant="tinted" size="lg" className="h-13.5 rounded-xl" onClick={add} disabled={!draft.trim()}>
                            {t("sxCommonAdd")}
                        </Button>
                    </div>
                )}
            </div>
        </FieldItem>
    );
}

export function ToggleChips({ label, hint, selected, options, onChange, disabled }: any) {
    const list = Array.isArray(selected) ? selected : [];
    const extra = list.filter((v: string) => !(options || []).includes(v));
    const all = [...(options || []), ...extra];
    return (
        <FieldItem label={label} hint={hint}>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={typeof label === "string" ? label : undefined}>
                {all.map((o: string) => {
                    const on = list.includes(o);
                    return (
                        <button
                            key={o}
                            type="button"
                            aria-pressed={on}
                            disabled={disabled}
                            onClick={() => onChange(on ? list.filter((x: string) => x !== o) : [...list, o])}
                            className={cn(
                                "inline-flex h-8 items-center rounded-full border px-3 font-mono text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
                                on
                                    ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                                    : "border-[#d2d2d7] text-foreground hover:bg-black/3 dark:border-[#48484a] dark:hover:bg-white/4"
                            )}
                        >
                            {o}
                        </button>
                    );
                })}
            </div>
        </FieldItem>
    );
}

export function KeyValueRows({ rows, onChange, disabled, keySuggestions, renderValue }: any) {
    const t = useT();
    const listId = useId();
    const setRow = (i: number, field: string, v: string) =>
        onChange(rows.map((r: any, idx: number) => (idx === i ? { ...r, [field]: v } : r)));
    return (
        <div className="flex flex-col gap-3">
            {rows.length > 0 && (
                <ul className={GROUP}>
                    {rows.map((r: any, i: number) => (
                        <Fragment key={i}>
                            {i > 0 && <li aria-hidden className={SEPARATOR} />}
                            <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                                <Input
                                    size="md"
                                    value={r.key}
                                    list={keySuggestions ? listId : undefined}
                                    disabled={disabled}
                                    onChange={(e: any) => setRow(i, "key", e.target.value)}
                                    placeholder={t("sxCommonKeyPlaceholder")}
                                    aria-label={t("sxCommonKey")}
                                    className="min-w-0 font-medium sm:w-2/5"
                                />
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    {renderValue?.(r, (v: string) => setRow(i, "value", v)) ?? (
                                        <Input
                                            size="md"
                                            value={r.value}
                                            disabled={disabled}
                                            onChange={(e: any) => setRow(i, "value", e.target.value)}
                                            placeholder={t("sxCommonValue")}
                                            aria-label={t("sxCommonValue")}
                                            className="min-w-0 flex-1"
                                        />
                                    )}
                                    {!disabled && (
                                        <TextAction
                                            tone="danger"
                                            onClick={() => onChange(rows.filter((_: any, idx: number) => idx !== i))}
                                        >
                                            {t("sxCommonRemove")}
                                        </TextAction>
                                    )}
                                </div>
                            </li>
                        </Fragment>
                    ))}
                </ul>
            )}
            {keySuggestions && (
                <datalist id={listId}>
                    {keySuggestions.map((k: string) => (
                        <option key={k} value={k} />
                    ))}
                </datalist>
            )}
            {!disabled && (
                <div>
                    <TextAction onClick={() => onChange([...rows, { key: "", value: "" }])}>
                        <AddLabel>{t("sxClientPoliciesEditorAddEntry")}</AddLabel>
                    </TextAction>
                </div>
            )}
        </div>
    );
}

export function ListRow({ title, subtitle, onOpen, trailing, chips }: any) {
    return (
        <li className="flex min-h-16 items-center gap-2 pe-3">
            <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 self-stretch py-3 ps-4 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
            >
                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-base font-medium">{title}</span>
                        {chips}
                    </div>
                    {subtitle && (
                        <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</div>
                    )}
                </div>
                <CaretRightIcon className="size-3.5 shrink-0 text-[#c7c7cc] dark:text-[#48484a]" />
            </button>
            {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
        </li>
    );
}

export function MoveButtons({ onUp, onDown, disabled }: any) {
    const t = useT();
    const cls =
        "grid size-8 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10";
    return (
        <>
            <button type="button" className={cls} onClick={onUp} disabled={disabled || !onUp} aria-label={t("sxAuthMoveUp")}>
                <CaretUpIcon className="size-4" />
            </button>
            <button type="button" className={cls} onClick={onDown} disabled={disabled || !onDown} aria-label={t("sxAuthMoveDown")}>
                <CaretDownIcon className="size-4" />
            </button>
        </>
    );
}

export function JsonCard({ rows, value, onChange, label }: any) {
    return (
        <div className={`${GROUP} p-4`}>
            <Textarea
                aria-label={label}
                className="font-mono text-xs"
                rows={rows}
                value={value}
                onChange={(ev: any) => onChange(ev.target.value)}
                spellCheck={false}
            />
        </div>
    );
}

export function ErrorNote({ children }: any) {
    return (
        <p role="alert" className="mt-2 px-0.5 text-[13px] text-[#d70015] [overflow-wrap:anywhere] dark:text-[#ff453a]">
            {children}
        </p>
    );
}

export function Footnote({ children }: any) {
    return <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">{children}</p>;
}

export function FormActions({ onSave, onCancel, saving, disabled, saveLabel }: any) {
    const t = useT();
    return (
        <div className="flex flex-col gap-1.5 sm:max-w-110">
            <Button type="button" size="form" block disabled={saving || disabled} onClick={onSave}>
                {saving ? t("sxCommonSaving") : (saveLabel ?? t("sxCommonSave"))}
            </Button>
            {onCancel && (
                <Button type="button" variant="plain" size="form" block disabled={saving} onClick={onCancel}>
                    {t("sxCommonCancel")}
                </Button>
            )}
        </div>
    );
}

export function SaveBar({ onClick, saving, disabled, label }: any) {
    const t = useT();
    return (
        <div className="flex justify-end">
            <Button type="button" size="form" onClick={onClick} disabled={saving || disabled}>
                {saving ? t("sxCommonSaving") : (label ?? t("sxCommonSave"))}
            </Button>
        </div>
    );
}

export function defaultConfig(properties: any[]) {
    const out: any = {};
    (properties || []).forEach((p: any) => {
        if (!p?.name) return;
        const d = p.defaultValue;
        if (p.type === "MultivaluedList" || p.type === "MultivaluedString") {
            if (Array.isArray(d)) out[p.name] = d;
            else if (d !== undefined && d !== null && d !== "") out[p.name] = [String(d)];
            else out[p.name] = [];
        } else if (p.type === "boolean") {
            out[p.name] = String(d === true || d === "true");
        } else if (p.type === "List") {
            out[p.name] = d !== undefined && d !== null && d !== "" ? String(d) : (p.options?.[0] ?? "");
        } else if (d !== undefined && d !== null) {
            out[p.name] = String(d);
        }
    });
    return out;
}

const toList = (v: any) =>
    Array.isArray(v) ? v.map(String) : v === undefined || v === null || v === "" ? [] : String(v).split("##");

export function ConfigFields({ properties, value, onChange, disabled }: any) {
    const t = useT();
    const props = (properties || []).filter((p: any) => p?.name);
    const val = value || {};
    const set = (name: string, v: any) => onChange({ ...val, [name]: v });
    if (props.length === 0) {
        return <p className="px-0.5 text-[15px] text-muted-foreground">{t("sxClientPoliciesEditorNoConfig")}</p>;
    }
    return (
        <div className="flex flex-col gap-5">
            {props.map((p: any) => {
                const label = tr(t, p.label || p.name);
                const hint = p.helpText ? tr(t, p.helpText) : undefined;
                const cur = val[p.name];
                switch (p.type) {
                    case "boolean":
                        return (
                            <ToggleField
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                checked={cur === true || cur === "true"}
                                onChange={(v: boolean) => set(p.name, String(v))}
                            />
                        );
                    case "List":
                        return (
                            <SelectField
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                value={cur === undefined || cur === null ? "" : String(cur)}
                                options={p.options || []}
                                onChange={(v: string) => set(p.name, v)}
                            />
                        );
                    case "MultivaluedList":
                        return (p.options || []).length > 0 ? (
                            <ToggleChips
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                selected={toList(cur)}
                                options={p.options}
                                onChange={(v: string[]) => set(p.name, v)}
                            />
                        ) : (
                            <StringList
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                values={toList(cur)}
                                onChange={(v: string[]) => set(p.name, v)}
                            />
                        );
                    case "MultivaluedString":
                        return (
                            <StringList
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                values={toList(cur)}
                                onChange={(v: string[]) => set(p.name, v)}
                            />
                        );
                    case "Text":
                    case "Script":
                    case "Map":
                        return (
                            <AreaField
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                mono={p.type !== "Text"}
                                value={cur === undefined || cur === null ? "" : typeof cur === "string" ? cur : JSON.stringify(cur)}
                                onChange={(v: string) => set(p.name, v)}
                            />
                        );
                    default:
                        return (
                            <TextField
                                key={p.name}
                                label={label}
                                hint={hint}
                                disabled={disabled}
                                type={
                                    p.type === "Password"
                                        ? "password"
                                        : p.type === "Integer" || p.type === "Number"
                                          ? "number"
                                          : undefined
                                }
                                value={
                                    cur === undefined || cur === null
                                        ? ""
                                        : Array.isArray(cur)
                                          ? cur.join(",")
                                          : typeof cur === "object"
                                            ? JSON.stringify(cur)
                                            : String(cur)
                                }
                                onChange={(v: string) => set(p.name, v)}
                            />
                        );
                }
            })}
        </div>
    );
}

export function configSummary(config: any) {
    const entries = Object.entries(config || {});
    if (entries.length === 0) return "";
    return entries
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" && v ? JSON.stringify(v) : String(v)}`)
        .join(" · ");
}
