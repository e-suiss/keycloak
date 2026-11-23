// @ts-nocheck

import { Checkbox } from "@ui/components/checkbox";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Fragment, useId, useState } from "react";
import { useT } from "../../ui/i18n";
import { GROUP, Notice, Section, SEPARATOR, TextAction } from "../../ui/kit";
import ComponentModal from "./cp-component-modal";
import {
    AddLabel,
    BackAction,
    configSummary,
    ConfirmDialog,
    FieldItem,
    FormActions,
    FormCard,
    KeyValueRows,
    ListRow,
    MultiPick,
    SelectField,
    TextField,
    ToggleField,
    tr
} from "./cp-ui";

export const USERNAME_EMAIL = ["username", "email"];
const ROOT_ATTRIBUTES = [...USERNAME_EMAIL, "firstName", "lastName"];

const ANNOTATION_KEYS = [
    "inputType",
    "inputHelperTextBefore",
    "inputHelperTextAfter",
    "inputOptionLabelsI18nPrefix",
    "inputTypePlaceholder",
    "inputTypeSize",
    "inputTypeCols",
    "inputTypeRows",
    "inputTypeStep",
    "kcNumberFormat",
    "kcNumberUnFormat"
];

const INPUT_TYPES = [
    "text",
    "textarea",
    "select",
    "select-radiobuttons",
    "multiselect",
    "multiselect-checkboxes",
    "html5-email",
    "html5-tel",
    "html5-url",
    "html5-number",
    "html5-range",
    "html5-datetime-local",
    "html5-date",
    "html5-month",
    "html5-week",
    "html5-time"
];

export const toAnnotationRows = (annotations: any) =>
    Object.entries(annotations || {}).map(([key, value]: any) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
        raw: typeof value !== "string"
    }));

export const fromAnnotationRows = (rows: any[]) => {
    const out: any = {};
    rows.forEach((r: any) => {
        const key = String(r.key || "").trim();
        if (!key) return;
        let value: any = r.value ?? "";
        if (r.raw) {
            try {
                value = JSON.parse(value);
            } catch {
                value = r.value;
            }
        }
        out[key] = value;
    });
    return out;
};

function RoleChecks({ label, hint, value, onChange, locked }: any) {
    const t = useT();
    const id = useId();
    const roles = [
        { key: "admin", label: t("sxUserProfileEditorRoleAdmin") },
        { key: "user", label: t("sxUserProfileEditorRoleUser") }
    ];
    return (
        <FieldItem label={label} hint={hint}>
            <div className="flex flex-wrap gap-5 ps-0.5">
                {roles.map(r => {
                    const isLocked = (locked || []).includes(r.key);
                    const checked = isLocked || value.includes(r.key);
                    return (
                        <label key={r.key} htmlFor={`${id}-${r.key}`} className="inline-flex cursor-pointer items-center gap-2 text-base">
                            <Checkbox
                                id={`${id}-${r.key}`}
                                checked={checked}
                                disabled={isLocked}
                                onCheckedChange={(v: any) =>
                                    onChange(v ? [...value.filter((x: string) => x !== r.key), r.key] : value.filter((x: string) => x !== r.key))
                                }
                            />
                            {r.label}
                        </label>
                    );
                })}
            </div>
        </FieldItem>
    );
}

export default function UpAttributeForm({ attribute, config, takenNames, clientScopes, validatorTypes, onBack, onSave, onDelete }: any) {
    const t = useT();
    const editing = !!attribute;
    const a = attribute || { permissions: { edit: ["admin"] } };
    const attrName = attribute?.name ?? "";

    const [name, setName] = useState(a.name ?? "");
    const [displayName, setDisplayName] = useState(a.displayName ?? "");
    const [multivalued, setMultivalued] = useState(a.multivalued === true);
    const [defaultValue, setDefaultValue] = useState(a.defaultValue ?? "");
    const [group, setGroup] = useState(a.group ?? "");
    const [hasSelector, setHasSelector] = useState(a.selector !== undefined && a.selector !== null);
    const [selectorScopes, setSelectorScopes] = useState<string[]>(a.selector?.scopes ?? []);
    const [isRequired, setIsRequired] = useState(a.required !== undefined && a.required !== null);
    const [requiredRoles, setRequiredRoles] = useState<string[]>(a.required?.roles ?? ["admin", "user"]);
    const [hasRequiredScopes, setHasRequiredScopes] = useState(a.required?.scopes !== undefined);
    const [requiredScopes, setRequiredScopes] = useState<string[]>(a.required?.scopes ?? []);
    const [permEdit, setPermEdit] = useState<string[]>(a.permissions?.edit ?? []);
    const [permView, setPermView] = useState<string[]>(a.permissions?.view ?? []);
    const [validations, setValidations] = useState<any[]>(
        Object.entries(a.validations || {}).map(([key, value]) => ({ key, value: value || {} }))
    );
    const [annotations, setAnnotations] = useState<any[]>(toAnnotationRows(a.annotations));
    const [modal, setModal] = useState<any>(null);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);

    const trimmed = name.trim();
    const nameError = !trimmed
        ? t("sxUserProfileEditorAttributeNameRequired")
        : !editing && takenNames.includes(trimmed)
          ? t("sxUserProfileEditorAttributeNameTaken")
          : "";
    const scopeNames = (clientScopes || []).map((s: any) => s.name).filter(Boolean).sort((x: string, y: string) => x.localeCompare(y));
    const basic = USERNAME_EMAIL.includes(attrName);
    const rolesValue = requiredRoles.includes("admin") && requiredRoles.includes("user") ? "both" : requiredRoles[0] || "both";

    const save = async () => {
        setTouched(true);
        if (nameError) return;
        setSaving(true);
        const validationObj = validations.reduce((acc: any, v: any) => {
            acc[v.key] = v.value || {};
            return acc;
        }, {});
        const view = Array.from(new Set([...permView, ...permEdit]));
        const next: any = {
            ...(editing ? attribute : {}),
            name: editing ? attrName : trimmed,
            displayName,
            permissions: { view, edit: permEdit },
            multivalued,
            annotations: fromAnnotationRows(annotations),
            validations: validationObj,
            defaultValue: defaultValue ? defaultValue : null
        };
        delete next.required;
        delete next.selector;
        if (hasSelector) next.selector = { scopes: selectorScopes };
        if (isRequired) {
            next.required = { roles: requiredRoles };
            if (hasRequiredScopes) next.required.scopes = requiredScopes;
        }
        if (group) next.group = group;
        else if (editing) next.group = null;
        else delete next.group;
        await onSave(next);
        setSaving(false);
    };

    const removeValidator = (key: string) =>
        setConfirmOpts({
            title: t("sxUserProfileEditorRemoveValidatorTitle"),
            message: t("sxUserProfileEditorRemoveValidatorMessage", { name: key }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: () => setValidations(list => list.filter(v => v.key !== key))
        });

    return (
        <>
            <BackAction onClick={onBack}>{t("sxRealmSettingsAttributes")}</BackAction>
            <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">
                {editing ? tr(t, attribute.displayName) || attribute.name : t("sxUserProfileEditorCreateAttribute")}
            </h2>

            <Section label={t("sxCommonGeneral")}>
                <FormCard>
                    <TextField
                        label={t("sxUserProfileEditorAttributeName")}
                        hint={t("sxUserProfileEditorAttributeNameHint")}
                        value={name}
                        onChange={setName}
                        disabled={editing}
                        mono
                        required
                        error={touched ? nameError : ""}
                    />
                    <TextField
                        label={t("sxCommonDisplayName")}
                        hint={t("sxUserProfileEditorDisplayNameHint")}
                        value={displayName}
                        onChange={setDisplayName}
                    />
                    <ToggleField
                        label={t("sxUserProfileEditorMultivalued")}
                        hint={t("sxUserProfileEditorMultivaluedHint")}
                        checked={multivalued}
                        onChange={setMultivalued}
                    />
                    {!ROOT_ATTRIBUTES.includes(attrName) && (
                        <TextField
                            label={t("sxUserProfileEditorDefaultValue")}
                            hint={t("sxUserProfileEditorDefaultValueHint")}
                            value={defaultValue}
                            onChange={setDefaultValue}
                        />
                    )}
                    <SelectField
                        label={t("sxUserProfileEditorAttributeGroup")}
                        value={group}
                        onChange={setGroup}
                        options={[
                            { value: "", label: t("sxUserProfileEditorNoGroup") },
                            ...(config?.groups || []).map((g: any) => ({ value: g.name, label: g.name }))
                        ]}
                    />
                </FormCard>
            </Section>

            {!basic && (
                <Section label={t("sxUserProfileEditorAvailability")}>
                    <FormCard>
                        <SelectField
                            label={t("sxUserProfileEditorEnabledWhen")}
                            hint={t("sxUserProfileEditorEnabledWhenHint")}
                            value={hasSelector ? "scopes" : "always"}
                            onChange={(v: string) => setHasSelector(v === "scopes")}
                            options={[
                                { value: "always", label: t("sxUserProfileEditorAlways") },
                                { value: "scopes", label: t("sxUserProfileEditorScopesAsRequested") }
                            ]}
                        />
                        {hasSelector && (
                            <MultiPick
                                label={t("sxUserProfileEditorClientScopes")}
                                selected={selectorScopes}
                                options={scopeNames}
                                onChange={setSelectorScopes}
                                placeholder={t("sxUserProfileEditorAddScope")}
                            />
                        )}
                        <ToggleField
                            label={t("sxUserProfileEditorRequired")}
                            hint={t("sxUserProfileEditorRequiredHint")}
                            checked={isRequired}
                            onChange={setIsRequired}
                        />
                        {isRequired && (
                            <>
                                <SelectField
                                    label={t("sxUserProfileEditorRequiredFor")}
                                    value={rolesValue}
                                    onChange={(v: string) => setRequiredRoles(v === "both" ? ["admin", "user"] : [v])}
                                    options={[
                                        { value: "both", label: t("sxUserProfileEditorRequiredForBoth") },
                                        { value: "user", label: t("sxUserProfileEditorRequiredForUsers") },
                                        { value: "admin", label: t("sxUserProfileEditorRequiredForAdmins") }
                                    ]}
                                />
                                <SelectField
                                    label={t("sxUserProfileEditorRequiredWhen")}
                                    hint={t("sxUserProfileEditorRequiredWhenHint")}
                                    value={hasRequiredScopes ? "scopes" : "always"}
                                    onChange={(v: string) => setHasRequiredScopes(v === "scopes")}
                                    options={[
                                        { value: "always", label: t("sxUserProfileEditorAlways") },
                                        { value: "scopes", label: t("sxUserProfileEditorScopesAsRequested") }
                                    ]}
                                />
                                {hasRequiredScopes && (
                                    <MultiPick
                                        label={t("sxUserProfileEditorClientScopes")}
                                        selected={requiredScopes}
                                        options={scopeNames}
                                        onChange={setRequiredScopes}
                                        placeholder={t("sxUserProfileEditorAddScope")}
                                    />
                                )}
                            </>
                        )}
                    </FormCard>
                </Section>
            )}

            <Section label={t("sxUserProfileEditorPermissions")}>
                <FormCard>
                    <RoleChecks
                        label={t("sxUserProfileEditorWhoCanEdit")}
                        hint={t("sxUserProfileEditorWhoCanEditHint")}
                        value={permEdit}
                        onChange={setPermEdit}
                    />
                    <RoleChecks
                        label={t("sxUserProfileEditorWhoCanView")}
                        hint={t("sxUserProfileEditorWhoCanViewHint")}
                        value={permView}
                        locked={permEdit}
                        onChange={setPermView}
                    />
                </FormCard>
            </Section>

            <Section
                label={t("sxUserProfileEditorValidators")}
                action={
                    <TextAction onClick={() => setModal({ key: null })}>
                        <AddLabel>{t("sxUserProfileEditorAddValidator")}</AddLabel>
                    </TextAction>
                }
            >
                {validations.length === 0 ? (
                    <Notice
                        title={t("sxUserProfileEditorNoValidatorsTitle")}
                        description={t("sxUserProfileEditorNoValidatorsDescription")}
                    />
                ) : (
                    <ul className={GROUP}>
                        {validations.map((v: any, i: number) => (
                            <Fragment key={v.key}>
                                {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                <ListRow
                                    title={v.key}
                                    subtitle={configSummary(v.value) || undefined}
                                    onOpen={() => setModal({ key: v.key })}
                                    trailing={
                                        <TextAction tone="danger" onClick={() => removeValidator(v.key)}>
                                            {t("sxCommonRemove")}
                                        </TextAction>
                                    }
                                />
                            </Fragment>
                        ))}
                    </ul>
                )}
            </Section>

            <Section label={t("sxUserProfileEditorAnnotations")}>
                <KeyValueRows
                    rows={annotations}
                    onChange={setAnnotations}
                    keySuggestions={ANNOTATION_KEYS}
                    renderValue={(row: any, set: any) =>
                        row.key === "inputType" ? (
                            <NativeSelect
                                size="sm"
                                className="min-w-0 flex-1"
                                aria-label={t("sxCommonValue")}
                                value={row.value}
                                onChange={(e: any) => set(e.target.value)}
                            >
                                <NativeSelectOption value="" disabled>
                                    {t("sxCommonSelectPlaceholder")}
                                </NativeSelectOption>
                                {row.value && !INPUT_TYPES.includes(row.value) && (
                                    <NativeSelectOption value={row.value}>{row.value}</NativeSelectOption>
                                )}
                                {INPUT_TYPES.map(o => (
                                    <NativeSelectOption key={o} value={o}>
                                        {o}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        ) : undefined
                    }
                />
            </Section>

            <div className="flex flex-col gap-4">
                <FormActions onSave={save} onCancel={onBack} saving={saving} saveLabel={editing ? undefined : t("sxCommonCreate")} />
                {onDelete && (
                    <div>
                        <TextAction tone="danger" onClick={onDelete}>
                            {t("sxUserProfileEditorDeleteAttribute")}
                        </TextAction>
                    </div>
                )}
            </div>

            {modal && (
                <ComponentModal
                    title={modal.key ? t("sxUserProfileEditorEditValidator") : t("sxUserProfileEditorAddValidator")}
                    typeLabel={t("sxUserProfileEditorValidatorType")}
                    types={validatorTypes}
                    exclude={validations.map((v: any) => v.key)}
                    initial={modal.key ? { type: modal.key, config: validations.find(v => v.key === modal.key)?.value || {} } : undefined}
                    onClose={() => setModal(null)}
                    onSubmit={({ type, config }: any) => {
                        setValidations(list =>
                            list.some(v => v.key === type)
                                ? list.map(v => (v.key === type ? { key: type, value: config } : v))
                                : [...list, { key: type, value: config }]
                        );
                        setModal(null);
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </>
    );
}
