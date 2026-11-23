// @ts-nocheck

import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { useId } from "react";
import { useT } from "../../ui/i18n";

export function ConfigField({ prop, value, onChange }: any) {
    const t = useT();
    const id = useId();
    const type = String(prop.type || "String").toLowerCase();
    const label = prop.label || prop.name;
    const hint = prop.helpText ? (
        <FieldDescription className="ps-0.5 text-[13px]">{prop.helpText}</FieldDescription>
    ) : null;
    if (type === "boolean") {
        return (
            <Field size="lg">
                <div className="flex items-center justify-between gap-4">
                    <FieldLabel htmlFor={id}>{label}</FieldLabel>
                    <Switch
                        id={id}
                        checked={value === true || value === "true"}
                        onCheckedChange={(v: boolean) => onChange(v)}
                    />
                </div>
                {hint}
            </Field>
        );
    }
    if (type === "list" && prop.options?.length) {
        return (
            <Field size="lg">
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <NativeSelect
                    id={id}
                    size="lg"
                    value={value ?? ""}
                    onChange={(e: any) => onChange(e.target.value)}
                    aria-label={label}
                    className="w-full"
                >
                    {value === undefined || value === "" ? (
                        <NativeSelectOption value="" disabled>
                            {t("sxAuthSelect")}
                        </NativeSelectOption>
                    ) : null}
                    {prop.options.map((o: string) => (
                        <NativeSelectOption key={o} value={o}>
                            {o}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
                {hint}
            </Field>
        );
    }
    if (type === "text" || type === "script") {
        return (
            <Field size="lg">
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <Textarea
                    id={id}
                    size="lg"
                    value={value ?? ""}
                    onChange={(e: any) => onChange(e.target.value)}
                    placeholder={prop.placeholder}
                />
                {hint}
            </Field>
        );
    }
    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
                id={id}
                size="lg"
                type={
                    prop.secret || type === "password"
                        ? "password"
                        : type === "int"
                          ? "number"
                          : "text"
                }
                value={value ?? ""}
                onChange={(e: any) => onChange(e.target.value)}
                placeholder={prop.placeholder}
            />
            {hint}
        </Field>
    );
}

export function configDefaults(properties: any[] = []) {
    const values: Record<string, any> = {};
    properties.forEach((p: any) => {
        if (p.defaultValue !== undefined && p.defaultValue !== null)
            values[p.name] = Array.isArray(p.defaultValue)
                ? p.defaultValue.join("##")
                : String(p.defaultValue);
    });
    return values;
}

export function stringifyConfig(values: Record<string, any>) {
    const config: Record<string, string> = {};
    Object.entries(values).forEach(([k, v]) => {
        config[k] = typeof v === "boolean" ? String(v) : (v ?? "");
    });
    return config;
}
