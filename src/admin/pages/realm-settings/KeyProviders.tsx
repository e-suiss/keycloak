// @ts-nocheck

import { DotsThreeIcon, PlusIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useId, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, Group, ListSkeleton, Notice, Row, Section, TextAction } from "../../ui/kit";
import { ChipMulti, ConfirmDialog, ErrorNote, FieldItem, Footnote } from "./fields";

const KEY_TYPE = "org.keycloak.keys.KeyProvider";

const first = (c: any, k: string) => c?.config?.[k]?.[0];
const flag = (c: any, k: string) => first(c, k) !== "false";

function stamp() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

export function KeyProviders({ realm, componentTypes, onChanged }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [list, setList] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState<any>(null);
    const [confirm, setConfirm] = useState<any>(null);
    const types = componentTypes || [];

    useEffect(() => {
        let alive = true;
        setList(null);
        setFailed(false);
        adminClient.components
            .find({ realm, type: KEY_TYPE })
            .then((res: any) => alive && setList(res || []))
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, attempt]);

    const refresh = () => {
        setAttempt(n => n + 1);
        onChanged?.();
    };

    const typeOf = (id: string) => types.find((x: any) => x.id === id);

    const setConfig = async (c: any, key: string, value: boolean, okMsg: string) => {
        try {
            await adminClient.components.update(
                { id: c.id, realm },
                { ...c, providerType: KEY_TYPE, config: { ...(c.config || {}), [key]: [String(value)] } }
            );
            addAlert(okMsg, AlertVariant.success);
            refresh();
        } catch (err) {
            addError(t("sxRealmSettingsProviderSaveError"), err);
        }
    };

    const remove = (c: any) =>
        setConfirm({
            title: t("sxRealmSettingsProviderDeleteTitle"),
            message: t("sxRealmSettingsProviderDeleteMessage", { name: c.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: c.id, realm });
                    addAlert(t("sxRealmSettingsProviderDeleted"), AlertVariant.success);
                    refresh();
                } catch (err) {
                    addError(t("sxRealmSettingsProviderDeleteError"), err);
                }
            }
        });

    const rotate = (c: any) =>
        setConfirm({
            title: t("sxRealmSettingsRotateTitle"),
            message: t("sxRealmSettingsRotateMessage", { name: c.name }),
            confirmLabel: t("sxRealmSettingsRotate"),
            onConfirm: async () => {
                const meta = typeOf(c.providerId);
                const allowed = new Set(
                    (meta?.properties || [])
                        .filter((p: any) => !["Password", "File"].includes(p.type))
                        .map((p: any) => p.name)
                );
                const config: any = {};
                Object.entries(c.config || {}).forEach(([k, v]) => {
                    if (allowed.has(k)) config[k] = v;
                });
                config.priority = [String(Number(first(c, "priority") || 0) + 1)];
                config.enabled = ["true"];
                config.active = ["true"];
                const base = String(c.name || c.providerId).replace(/-\d{12}$/, "");
                try {
                    await adminClient.components.create({
                        realm,
                        name: `${base}-${stamp()}`,
                        providerId: c.providerId,
                        providerType: KEY_TYPE,
                        parentId: c.parentId,
                        config
                    });
                    await adminClient.components.update(
                        { id: c.id, realm },
                        { ...c, providerType: KEY_TYPE, config: { ...(c.config || {}), active: ["false"] } }
                    );
                    addAlert(t("sxRealmSettingsRotateSuccess"), AlertVariant.success);
                } catch (err) {
                    addError(t("sxRealmSettingsRotateError"), err);
                }
                refresh();
            }
        });

    const addMenu = types.length > 0 && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <TextAction>
                    <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
                        <PlusIcon weight="bold" />
                        {t("sxRealmSettingsAddProvider")}
                    </span>
                </TextAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-64">
                {[...types]
                    .sort((a: any, b: any) => a.id.localeCompare(b.id))
                    .map((x: any) => (
                        <DropdownMenuItem key={x.id} onClick={() => setEditing({ type: x })}>
                            <span className="truncate font-mono text-[15px]">{x.id}</span>
                        </DropdownMenuItem>
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const sorted = [...(list || [])].sort(
        (a, b) => Number(first(b, "priority") || 0) - Number(first(a, "priority") || 0)
    );

    return (
        <Section label={t("sxRealmSettingsKeyProviders")} action={list && addMenu}>
            {failed ? (
                <Notice
                    title={t("sxRealmSettingsKeyProvidersLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            ) : list === null ? (
                <ListSkeleton rows={2} />
            ) : list.length === 0 ? (
                <Notice
                    title={t("sxRealmSettingsNoKeyProvidersTitle")}
                    description={t("sxRealmSettingsNoKeyProvidersDescription")}
                />
            ) : (
                <Group>
                    {sorted.map((c: any) => {
                        const enabled = flag(c, "enabled");
                        const active = flag(c, "active");
                        return (
                            <Row
                                key={c.id}
                                title={c.name}
                                subtitle={[
                                    c.providerId,
                                    t("sxRealmSettingsKeyPriority", { priority: first(c, "priority") ?? "0" })
                                ].join(" · ")}
                                trailing={
                                    <>
                                        {!enabled ? (
                                            <Chip tone="danger">{t("sxRealmSettingsKeyDisabled")}</Chip>
                                        ) : !active ? (
                                            <Chip tone="warning">{t("sxRealmSettingsKeyPassive")}</Chip>
                                        ) : (
                                            <Chip tone="success">{t("sxRealmSettingsKeyActive")}</Chip>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label={t("sxCommonActions")}
                                                    title={t("sxCommonActions")}
                                                >
                                                    <DotsThreeIcon weight="bold" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setEditing({ type: typeOf(c.providerId), component: c })
                                                    }
                                                >
                                                    {t("sxRealmSettingsEdit")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setConfig(
                                                            c,
                                                            "active",
                                                            !active,
                                                            active
                                                                ? t("sxRealmSettingsProviderMadePassive")
                                                                : t("sxRealmSettingsProviderMadeActive")
                                                        )
                                                    }
                                                >
                                                    {active
                                                        ? t("sxRealmSettingsMakePassive")
                                                        : t("sxRealmSettingsMakeActive")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setConfig(
                                                            c,
                                                            "enabled",
                                                            !enabled,
                                                            enabled
                                                                ? t("sxRealmSettingsProviderDisabled")
                                                                : t("sxRealmSettingsProviderEnabled")
                                                        )
                                                    }
                                                >
                                                    {enabled ? t("sxCommonDisable") : t("sxCommonEnable")}
                                                </DropdownMenuItem>
                                                {/-generated$/.test(c.providerId || "") && (
                                                    <DropdownMenuItem onClick={() => rotate(c)}>
                                                        {t("sxRealmSettingsRotate")}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem variant="destructive" onClick={() => remove(c)}>
                                                    {t("sxCommonDelete")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                }
                            />
                        );
                    })}
                </Group>
            )}
            <Footnote>{t("sxRealmSettingsKeyProvidersHint")}</Footnote>
            {editing && (
                <ProviderModal
                    realm={realm}
                    type={editing.type}
                    component={editing.component}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        refresh();
                    }}
                />
            )}
            <ConfirmDialog opts={confirm} onClose={() => setConfirm(null)} />
        </Section>
    );
}

function initialConfig(properties: any[], component: any) {
    if (component) return { ...(component.config || {}) };
    const cfg: any = {};
    properties.forEach((p: any) => {
        if (p.defaultValue === undefined || p.defaultValue === null || p.defaultValue === "") return;
        cfg[p.name] = Array.isArray(p.defaultValue) ? p.defaultValue.map(String) : [String(p.defaultValue)];
    });
    return cfg;
}

function ProviderModal({ realm, type, component, onClose, onSaved }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const nameId = useId();
    const properties = type?.properties || [];
    const providerId = component?.providerId || type?.id;
    const [name, setName] = useState(component?.name ?? type?.id ?? "");
    const [config, setConfig] = useState<any>(() => initialConfig(properties, component));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        const n = name.trim();
        if (!n) {
            setError(t("sxRealmSettingsNameRequired"));
            return;
        }
        setError("");
        const cfg: any = {};
        Object.entries(config).forEach(([k, v]) => {
            cfg[k] = Array.isArray(v) ? v : [String(v)];
        });
        setBusy(true);
        try {
            if (component) {
                await adminClient.components.update(
                    { id: component.id, realm },
                    { ...component, name: n, providerType: KEY_TYPE, config: cfg }
                );
            } else {
                await adminClient.components.create({
                    realm,
                    name: n,
                    providerId,
                    providerType: KEY_TYPE,
                    config: cfg
                });
            }
            addAlert(t("sxRealmSettingsProviderSaved"), AlertVariant.success);
            onSaved();
        } catch (err) {
            addError(t("sxRealmSettingsProviderSaveError"), err);
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>
                        {component ? t("sxRealmSettingsEditProvider") : t("sxRealmSettingsAddProvider")}
                    </ModalTitle>
                    <ModalDescription className="[overflow-wrap:anywhere]">
                        {type?.helpText ? `${providerId} · ${t(type.helpText)}` : providerId}
                    </ModalDescription>
                </ModalHeader>
                <ModalBody className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
                    <FieldItem label={t("sxCommonName")} htmlFor={nameId}>
                        <Input id={nameId} size="lg" value={name} onChange={(ev: any) => setName(ev.target.value)} />
                        {error && <ErrorNote>{error}</ErrorNote>}
                    </FieldItem>
                    {!type && <Notice title={t("sxRealmSettingsProviderTypeUnknownTitle")} description={t("sxRealmSettingsProviderTypeUnknownDescription")} />}
                    <DynamicConfig
                        properties={properties}
                        value={config}
                        onChange={(k: string, v: string[]) => setConfig((p: any) => ({ ...p, [k]: v }))}
                    />
                </ModalBody>
                <ModalFooter>
                    <Button variant="plain" onClick={onClose}>
                        {t("sxCommonCancel")}
                    </Button>
                    <Button onClick={save} disabled={busy}>
                        {busy ? t("sxCommonSaving") : t("sxCommonSave")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export function DynamicConfig({ properties, value, onChange }: any) {
    return (
        <>
            {(properties || []).map((p: any) =>
                p?.name ? (
                    <DynamicField key={p.name} prop={p} value={value?.[p.name]} onChange={(v: string[]) => onChange(p.name, v)} />
                ) : null
            )}
        </>
    );
}

function DynamicField({ prop, value, onChange }: any) {
    const t = useT();
    const id = useId();
    const fileRef = useRef<HTMLInputElement>(null);
    const label = prop.label ? t(prop.label, { defaultValue: prop.label }) : prop.name;
    const hint = prop.helpText ? t(prop.helpText, { defaultValue: prop.helpText }) : undefined;
    const arr: string[] = Array.isArray(value) ? value : value === undefined ? [] : [String(value)];
    const one = arr[0] ?? "";
    const type = String(prop.type || "String");

    if (type === "boolean") {
        return (
            <div className="flex items-center justify-between gap-4">
                <label htmlFor={id} className="min-w-0 cursor-pointer">
                    <span className="block text-[15px] font-medium">{label}</span>
                    {hint && <span className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</span>}
                </label>
                <Switch id={id} checked={one === "true"} onCheckedChange={(v: boolean) => onChange([String(v)])} />
            </div>
        );
    }

    let control: any;
    if (type === "List") {
        const options = (prop.options || []).map(String);
        control = (
            <NativeSelect id={id} size="lg" className="w-full" value={one} onChange={(ev: any) => onChange([ev.target.value])}>
                {!options.includes(one) && <NativeSelectOption value={one}>{one || "—"}</NativeSelectOption>}
                {options.map((o: string) => (
                    <NativeSelectOption key={o} value={o}>
                        {o}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        );
    } else if (type === "MultivaluedList") {
        control = (
            <ChipMulti
                selected={arr}
                options={(prop.options || []).map(String)}
                onChange={onChange}
                placeholder={t("sxRealmSettingsSelect")}
            />
        );
    } else if (type === "Password") {
        control = (
            <Input id={id} size="lg" type="password" autoComplete="new-password" value={one} onChange={(ev: any) => onChange([ev.target.value])} />
        );
    } else if (type === "MultivaluedString") {
        control = (
            <Textarea
                id={id}
                rows={3}
                className="font-mono text-[13px]"
                value={arr.join("\n")}
                onChange={(ev: any) => onChange(ev.target.value.split("\n").filter((s: string) => s !== ""))}
            />
        );
    } else if (type === "File" || type === "Text" || type === "Script") {
        control = (
            <div className="flex flex-col gap-2">
                <Textarea
                    id={id}
                    rows={type === "File" ? 4 : 3}
                    className="font-mono text-xs"
                    spellCheck={false}
                    value={one}
                    onChange={(ev: any) => onChange([ev.target.value])}
                />
                {type === "File" && (
                    <>
                        <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            onChange={async ev => {
                                const f = ev.target.files?.[0];
                                ev.target.value = "";
                                if (f) onChange([await f.text()]);
                            }}
                        />
                        <div>
                            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                                <UploadSimpleIcon />
                                {t("sxRealmSettingsUploadFile")}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        );
    } else {
        control = <Input id={id} size="lg" value={one} onChange={(ev: any) => onChange([ev.target.value])} />;
    }

    return (
        <FieldItem label={label} hint={hint} htmlFor={id}>
            {control}
        </FieldItem>
    );
}
