// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { RadioGroup, RadioGroupItem } from "@ui/components/radio-group";
import { Textarea } from "@ui/components/textarea";
import { isUserProfileError } from "../../../shared/keycloak-ui-shared";
import { useT } from "../../ui/i18n";
import { GROUP, SEPARATOR, Section, TextAction } from "../../ui/kit";
import { CheckList } from "./shared";

export const ROOT_ATTRIBUTES = ["username", "email", "firstName", "lastName"];
const HIDDEN_ATTRIBUTES = ["kc.email.pending"];

const isBundleKey = (v: any) => typeof v === "string" && v.includes("${");
const unwrap = (v: string) => v.substring(v.indexOf("${") + 2, v.lastIndexOf("}"));

export function labelOf(t: any, text?: string, fallback?: string, prefix?: string) {
    const value = text || fallback || "";
    if (!value) return "";
    const key = isBundleKey(value) ? unwrap(value) : value;
    const full = prefix ? `${prefix}.${key}` : key;
    return t(full, { defaultValue: isBundleKey(value) ? key : value });
}

export function isRequired(attribute: any) {
    if (attribute?.required) return true;
    const min = attribute?.validators?.length?.min;
    return typeof min === "number" ? min > 0 : Number(min) > 0;
}

const toArray = (v: any) => (Array.isArray(v) ? v.map(String) : v == null || v === "" ? [] : [String(v)]);

export function visibleAttributes(metadata: any, hideReadOnly: boolean) {
    return (metadata?.attributes || []).filter(
        (a: any) => !HIDDEN_ATTRIBUTES.includes(a.name) && !(hideReadOnly && a.readOnly)
    );
}

export function toFormValues(user: any, metadata: any) {
    const values: Record<string, any> = {};
    (metadata?.attributes || []).forEach((a: any) => {
        if (ROOT_ATTRIBUTES.includes(a.name)) values[a.name] = user?.[a.name] ?? "";
        else {
            const current = toArray(user?.attributes?.[a.name]);
            values[a.name] = current.length || a.defaultValue == null ? current : toArray(a.defaultValue);
        }
    });
    return values;
}

export function toRepresentation(values: Record<string, any>, metadata: any, base: any = {}) {
    const rep: any = { ...base };
    const attributes: Record<string, string[]> = { ...(base.attributes || {}) };
    (metadata?.attributes || []).forEach((a: any) => {
        if (!(a.name in values)) return;
        if (ROOT_ATTRIBUTES.includes(a.name)) {
            const v = String(values[a.name] ?? "").trim();
            rep[a.name] = v || (a.name === "username" ? undefined : "");
        } else {
            attributes[a.name] = toArray(values[a.name]).filter(v => v !== "");
        }
    });
    rep.attributes = attributes;
    delete rep.userProfileMetadata;
    return rep;
}

export function profileErrors(error: any, t: any) {
    if (!isUserProfileError(error)) return null;
    const data: any = error.responseData;
    const list = Array.isArray(data?.errors) ? data.errors : [data];
    const result: Record<string, string> = {};
    list.forEach((e: any) => {
        const params = Object.fromEntries(
            (e.params || []).map((p: any, i: number) => [String(i), isBundleKey(p) ? t(unwrap(p)) : p])
        );
        const key = isBundleKey(e.errorMessage) ? unwrap(e.errorMessage) : e.errorMessage;
        result[e.field] = t(key || "", { ...params, defaultValue: e.errorMessage || e.field });
    });
    return result;
}

function determineType(attribute: any, value: any) {
    if (ROOT_ATTRIBUTES.includes(attribute.name)) return attribute.name === "email" ? "html5-email" : "text";
    const inputType = attribute.annotations?.inputType;
    if (attribute.multivalued) {
        if (inputType && String(inputType).startsWith("multiselect")) return inputType;
        return "multi-input";
    }
    if (!inputType && Array.isArray(value) && value.length > 1) return "multi-input";
    return inputType || "text";
}

export function ProfileFields({
    metadata,
    values,
    onChange,
    errors,
    hideReadOnly,
    disabled,
    supportedLocales,
    idPrefix = "profile"
}: {
    metadata: any;
    values: Record<string, any>;
    onChange: (name: string, value: any) => void;
    errors?: Record<string, string>;
    hideReadOnly?: boolean;
    disabled?: boolean;
    supportedLocales?: string[];
    idPrefix?: string;
}) {
    const t = useT();
    const attributes = visibleAttributes(metadata, !!hideReadOnly);
    const groups = [{ name: undefined }, ...(metadata?.groups || [])]
        .map((group: any) => ({
            group,
            attributes: attributes.filter((a: any) => (a.group || undefined) === group.name)
        }))
        .filter(g => g.attributes.length > 0);

    return (
        <>
            {groups.map(({ group, attributes: list }) => (
                <Section
                    key={group.name ?? "__general"}
                    label={group.name ? labelOf(t, group.displayHeader, group.name) : t("sxUserDetailProfile")}
                >
                    {group.displayDescription && (
                        <p className="mb-3 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                            {labelOf(t, group.displayDescription)}
                        </p>
                    )}
                    <div className="flex flex-col gap-4">
                        {list.map((attribute: any) => (
                            <ProfileField
                                key={attribute.name}
                                id={`${idPrefix}-${attribute.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                                attribute={attribute}
                                value={values[attribute.name]}
                                onChange={(v: any) => onChange(attribute.name, v)}
                                error={errors?.[attribute.name]}
                                disabled={disabled}
                                supportedLocales={supportedLocales}
                            />
                        ))}
                    </div>
                </Section>
            ))}
        </>
    );
}

function ProfileField({ id, attribute, value, onChange, error, disabled, supportedLocales }: any) {
    const t = useT();
    const annotations = attribute.annotations || {};
    const type = determineType(attribute, value);
    const readOnly = !!attribute.readOnly || !!disabled;
    const required = isRequired(attribute);
    const options: string[] = attribute.validators?.options?.options || [];
    const optionLabels = annotations.inputOptionLabels || {};
    const optionPrefix = annotations.inputOptionLabelsI18nPrefix;
    const optionLabel = (o: string) => labelOf(t, optionLabels[o], o, optionLabels[o] ? undefined : optionPrefix);
    const placeholder = annotations.inputTypePlaceholder ? labelOf(t, annotations.inputTypePlaceholder) : undefined;
    const before = annotations.inputHelperTextBefore ? labelOf(t, annotations.inputHelperTextBefore) : null;
    const after = annotations.inputHelperTextAfter ? labelOf(t, annotations.inputHelperTextAfter) : null;
    const list = toArray(value);
    const single = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
    const setSingle = (v: string) => onChange(ROOT_ATTRIBUTES.includes(attribute.name) ? v : v === "" ? [] : [v]);
    const invalid = error ? true : undefined;

    let control;
    if (attribute.name === "locale" && (supportedLocales || []).length > 0) {
        control = (
            <NativeSelect
                size="lg"
                className="w-full"
                id={id}
                disabled={readOnly}
                aria-invalid={invalid}
                value={single}
                onChange={(e: any) => setSingle(e.target.value)}
            >
                <NativeSelectOption value="">{t("sxCommonSelectPlaceholder")}</NativeSelectOption>
                {supportedLocales.map((l: string) => (
                    <NativeSelectOption key={l} value={l}>
                        {labelOf(t, `\${locale_${l}}`, l)}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        );
    } else if (type === "select") {
        control = (
            <NativeSelect
                size="lg"
                className="w-full"
                id={id}
                disabled={readOnly}
                aria-invalid={invalid}
                value={single}
                onChange={(e: any) => setSingle(e.target.value)}
            >
                <NativeSelectOption value="">{t("sxCommonSelectPlaceholder")}</NativeSelectOption>
                {options.map(o => (
                    <NativeSelectOption key={o} value={o}>
                        {optionLabel(o)}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        );
    } else if (type === "select-radiobuttons") {
        control = (
            <div className={`${GROUP} px-4 py-3`}>
                <RadioGroup value={single} onValueChange={(v: string) => setSingle(v)} disabled={readOnly}>
                    {options.map(o => (
                        <label key={o} className="flex min-h-8 cursor-pointer items-center gap-3 text-[15px]">
                            <RadioGroupItem value={o} />
                            {optionLabel(o)}
                        </label>
                    ))}
                </RadioGroup>
            </div>
        );
    } else if (type === "multiselect" || type === "multiselect-checkboxes") {
        control = (
            <CheckList
                disabled={readOnly}
                value={list}
                onChange={onChange}
                options={options.map(o => ({ value: o, label: optionLabel(o) }))}
            />
        );
    } else if (type === "textarea") {
        control = (
            <Textarea
                size="lg"
                id={id}
                readOnly={readOnly}
                aria-invalid={invalid}
                rows={Number(annotations.inputTypeRows) || undefined}
                cols={Number(annotations.inputTypeCols) || undefined}
                placeholder={placeholder}
                value={single}
                onChange={(e: any) => setSingle(e.target.value)}
            />
        );
    } else if (type === "multi-input") {
        const rows = list.length ? list : [""];
        const setRow = (i: number, v: string) => onChange(rows.map((r, idx) => (idx === i ? v : r)));
        control = (
            <div className="flex flex-col gap-2">
                {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Input
                            size="lg"
                            id={i === 0 ? id : undefined}
                            aria-label={labelOf(t, attribute.displayName, attribute.name)}
                            readOnly={readOnly}
                            aria-invalid={invalid}
                            placeholder={placeholder}
                            value={r}
                            onChange={(e: any) => setRow(i, e.target.value)}
                        />
                        {!readOnly && rows.length > 1 && (
                            <TextAction tone="danger" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                                {t("sxCommonRemove")}
                            </TextAction>
                        )}
                    </div>
                ))}
                {!readOnly && (
                    <div>
                        <Button type="button" variant="plain" size="sm" onClick={() => onChange([...rows, ""])}>
                            {t("sxUserDetailXAddValue")}
                        </Button>
                    </div>
                )}
            </div>
        );
    } else {
        const htmlType = String(type).startsWith("html5-") ? String(type).substring(6) : "text";
        control = (
            <Input
                size="lg"
                id={id}
                type={htmlType}
                readOnly={readOnly}
                aria-invalid={invalid}
                placeholder={placeholder}
                min={annotations.inputTypeMin}
                max={annotations.inputTypeMax}
                step={annotations.inputTypeStep}
                pattern={annotations.inputTypePattern}
                maxLength={annotations.inputTypeMaxlength}
                value={single}
                onChange={(e: any) => setSingle(e.target.value)}
                className={readOnly ? "text-muted-foreground" : undefined}
            />
        );
    }

    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>
                {labelOf(t, attribute.displayName, attribute.name)}
                {required && <span className="text-[#d70015] dark:text-[#ff453a]"> *</span>}
            </FieldLabel>
            {before && <FieldDescription className="ps-0.5 text-[13px]">{before}</FieldDescription>}
            {control}
            {after && <FieldDescription className="ps-0.5 text-[13px]">{after}</FieldDescription>}
            {error && <FieldError className="ps-0.5 text-[13px]">{error}</FieldError>}
        </Field>
    );
}

export function GroupedChips({ items, onRemove }: { items: any[]; onRemove: (item: any) => void }) {
    const t = useT();
    return (
        <ul className={GROUP}>
            {items.map((g, i) => (
                <li key={g.id}>
                    {i > 0 && <div className={SEPARATOR} />}
                    <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0 font-mono text-[15px] [overflow-wrap:anywhere]">{g.path || g.name}</span>
                        <TextAction tone="danger" onClick={() => onRemove(g)}>
                            {t("sxCommonRemove")}
                        </TextAction>
                    </div>
                </li>
            ))}
        </ul>
    );
}
