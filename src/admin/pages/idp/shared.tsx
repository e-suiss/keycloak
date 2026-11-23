// @ts-nocheck
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
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
import { useEffect, useState } from "react";
import { useAdminClient } from "../../admin-client";
import { Group } from "../../ui/kit";
import { useT } from "../../ui/i18n";

export const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

export const MULTI_SEPARATOR = "##";

export const splitMulti = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String).filter(x => x !== "");
    if (v == null || v === "") return [];
    return String(v)
        .split(MULTI_SEPARATOR)
        .filter(x => x !== "");
};

export const lines = (s: string) =>
    String(s || "")
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

export function useTx() {
    const t = useT();
    return (s: any) => (s ? t(String(s), { defaultValue: String(s) }) : s);
}

export function useServerInfo() {
    const { adminClient } = useAdminClient();
    const [state, setState] = useState<any>({ status: "loading", info: null });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState({ status: "loading", info: null });
        adminClient.serverInfo
            .find()
            .then((info: any) => alive && setState({ status: "ready", info: info || {} }))
            .catch(() => alive && setState({ status: "error", info: null }));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt]);
    const features: Record<string, boolean> = {};
    (state.info?.features || []).forEach((f: any) => {
        if (f?.name) features[f.name] = !!f.enabled;
    });
    return {
        status: state.status,
        info: state.info,
        isFeatureEnabled: (name: string) => !!features[name],
        retry: () => setAttempt(n => n + 1)
    };
}

export function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <div className="text-base [overflow-wrap:anywhere]">{label}</div>
                {hint && (
                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{hint}</div>
                )}
            </div>
            <Switch
                checked={!!checked}
                disabled={disabled}
                aria-label={typeof label === "string" ? label : undefined}
                onCheckedChange={(v: boolean) => onChange(v)}
            />
        </li>
    );
}

export function FormField({ label, hint, htmlFor, required, error, children }: any) {
    return (
        <Field size="lg">
            <FieldLabel htmlFor={htmlFor}>
                {label}
                {required && <span className="text-destructive"> *</span>}
            </FieldLabel>
            {children}
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
            {error && <FieldError className="ps-0.5 text-[13px]">{error}</FieldError>}
        </Field>
    );
}

export function TextField({
    id,
    label,
    hint,
    value,
    onChange,
    type = "text",
    placeholder,
    readOnly,
    required,
    error,
    min,
    max,
    mono
}: any) {
    return (
        <FormField label={label} hint={hint} htmlFor={id} required={required} error={error}>
            <Input
                size="lg"
                id={id}
                type={type}
                min={min}
                max={max}
                readOnly={readOnly}
                aria-invalid={error ? true : undefined}
                className={[readOnly ? "text-muted-foreground" : "", mono ? "font-mono text-[15px]" : ""].join(" ")}
                value={value ?? ""}
                placeholder={placeholder}
                onChange={(e: any) => onChange?.(e.target.value)}
            />
        </FormField>
    );
}

export function AreaField({ id, label, hint, value, onChange, rows = 4, placeholder, required, error, readOnly }: any) {
    return (
        <FormField label={label} hint={hint} htmlFor={id} required={required} error={error}>
            <Textarea
                size="lg"
                id={id}
                rows={rows}
                readOnly={readOnly}
                aria-invalid={error ? true : undefined}
                className="font-mono text-[14px]"
                value={value ?? ""}
                placeholder={placeholder}
                onChange={(e: any) => onChange?.(e.target.value)}
            />
        </FormField>
    );
}

export function SelectField({ id, label, hint, value, onChange, options, required, error, disabled }: any) {
    return (
        <FormField label={label} hint={hint} htmlFor={id} required={required} error={error}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                disabled={disabled}
                value={value ?? ""}
                onChange={(e: any) => onChange(e.target.value)}
            >
                {options.map((o: any) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FormField>
    );
}

export function CopyField({ id, label, hint, value }: any) {
    const t = useT();
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <FormField label={label} hint={hint} htmlFor={id}>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    size="lg"
                    id={id}
                    readOnly
                    value={value}
                    className="font-mono text-[14px] text-muted-foreground"
                />
                <Button
                    type="button"
                    variant="secondary"
                    className="h-13.5 shrink-0 rounded-xl px-5 text-[15px] font-medium"
                    onClick={copy}
                >
                    {copied ? t("sxIdpDetailCopied") : t("sxCommonCopy")}
                </Button>
            </div>
        </FormField>
    );
}

export function ConfirmDialog({ opts, setOpts }: any) {
    const t = useT();
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && setOpts(null)}>
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
                            setOpts(null);
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

export function OpenRow({ title, subtitle, onOpen, trailing, testId }: any) {
    return (
        <li
            data-testid={testId}
            className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4"
        >
            <button
                type="button"
                onClick={onOpen}
                className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
            >
                <span className="w-full truncate text-base font-medium">{title}</span>
                {subtitle && (
                    <span className="mt-0.5 w-full text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {subtitle}
                    </span>
                )}
            </button>
            {trailing && <div className="flex shrink-0 items-center gap-3">{trailing}</div>}
        </li>
    );
}

const isBool = (p: any) => /^boolean$/i.test(String(p?.type || ""));

export function propertyDefault(p: any) {
    if (p?.defaultValue == null) return undefined;
    const type = String(p.type || "String");
    if (type === "MultivaluedList" || type === "MultivaluedString") {
        return Array.isArray(p.defaultValue) ? p.defaultValue.map(String) : splitMulti(p.defaultValue);
    }
    return String(p.defaultValue);
}

export function DynamicFields({ properties, read, write, idPrefix = "dyn", errors, readOnlyNames }: any) {
    const t = useT();
    const tx = useTx();
    const list: any[] = (properties || []).filter((p: any) => p?.name);
    const switches = list.filter(isBool);
    const others = list.filter(p => !isBool(p));
    const str = (p: any) => {
        const v = read(p.name);
        if (Array.isArray(v)) return v[0] ?? "";
        if (v == null) {
            const d = propertyDefault(p);
            return Array.isArray(d) ? d[0] ?? "" : d ?? "";
        }
        return String(v);
    };
    const multi = (p: any) => {
        const v = read(p.name);
        if (v == null) {
            const d = propertyDefault(p);
            return Array.isArray(d) ? d : d ? [d] : [];
        }
        return splitMulti(v);
    };

    return (
        <>
            {others.map((p: any) => {
                const type = String(p.type || "String");
                const id = `${idPrefix}-${p.name}`;
                const label = tx(p.label || p.name);
                const hint = tx(p.helpText);
                const required = !!p.required;
                const error = errors?.has?.(p.name) ? t("sxIdpDetailFieldRequired") : undefined;
                const readOnly = readOnlyNames?.includes?.(p.name) || !!p.readOnly;
                if (type === "List" && Array.isArray(p.options) && p.options.length) {
                    return (
                        <SelectField
                            key={p.name}
                            id={id}
                            label={label}
                            hint={hint}
                            required={required}
                            error={error}
                            disabled={readOnly}
                            value={str(p)}
                            onChange={(v: string) => write(p.name, v)}
                            options={[
                                ...(str(p) === "" || !required
                                    ? [{ value: "", label: t("sxCommonSelectPlaceholder") }]
                                    : []),
                                ...p.options.map((o: string) => ({ value: o, label: tx(o) }))
                            ]}
                        />
                    );
                }
                if (type === "MultivaluedList" && Array.isArray(p.options) && p.options.length) {
                    const selected = multi(p);
                    return (
                        <FormField key={p.name} label={label} hint={hint} required={required} error={error}>
                            <Group>
                                {p.options.map((o: string) => (
                                    <li key={o}>
                                        <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5">
                                            <Checkbox
                                                checked={selected.includes(o)}
                                                disabled={readOnly}
                                                onCheckedChange={(c: boolean) =>
                                                    write(
                                                        p.name,
                                                        c ? [...selected, o] : selected.filter(x => x !== o)
                                                    )
                                                }
                                            />
                                            <span className="text-[15px] [overflow-wrap:anywhere]">{tx(o)}</span>
                                        </label>
                                    </li>
                                ))}
                            </Group>
                        </FormField>
                    );
                }
                if (type === "MultivaluedString" || type === "MultivaluedList") {
                    return (
                        <MultiLineField
                            key={p.name}
                            id={id}
                            label={label}
                            hint={hint || t("sxIdpDetailOnePerLine")}
                            required={required}
                            error={error}
                            values={multi(p)}
                            onChange={(vals: string[]) => write(p.name, vals)}
                        />
                    );
                }
                if (type === "Text" || type === "Script") {
                    return (
                        <AreaField
                            key={p.name}
                            id={id}
                            label={label}
                            hint={hint}
                            required={required}
                            error={error}
                            readOnly={readOnly}
                            value={str(p)}
                            onChange={(v: string) => write(p.name, v)}
                        />
                    );
                }
                const inputType =
                    type === "Password" || p.secret
                        ? "password"
                        : type === "Integer" || type === "Number"
                          ? "number"
                          : type === "Url"
                            ? "url"
                            : "text";
                return (
                    <TextField
                        key={p.name}
                        id={id}
                        label={label}
                        hint={hint}
                        required={required}
                        error={error}
                        readOnly={readOnly}
                        type={inputType}
                        value={str(p)}
                        onChange={(v: string) => write(p.name, v)}
                    />
                );
            })}
            {switches.length > 0 && (
                <Group>
                    {switches.map((p: any) => (
                        <SwitchRow
                            key={p.name}
                            label={tx(p.label || p.name)}
                            hint={tx(p.helpText)}
                            checked={str(p) === "true"}
                            onChange={(v: boolean) => write(p.name, v ? "true" : "false")}
                        />
                    ))}
                </Group>
            )}
        </>
    );
}

export function MultiLineField({ id, label, hint, values, onChange, required, error, placeholder }: any) {
    const [text, setText] = useState((values || []).join("\n"));
    const joined = (values || []).join("\n");
    useEffect(() => {
        if (lines(text).join("\n") !== joined) setText(joined);
    }, [joined]);
    return (
        <FormField label={label} hint={hint} htmlFor={id} required={required} error={error}>
            <Textarea
                size="lg"
                id={id}
                rows={3}
                aria-invalid={error ? true : undefined}
                value={text}
                placeholder={placeholder}
                onChange={(e: any) => {
                    setText(e.target.value);
                    onChange(lines(e.target.value));
                }}
            />
        </FormField>
    );
}
