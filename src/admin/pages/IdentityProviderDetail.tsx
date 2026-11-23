// @ts-nocheck

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    AdminPage,
    Chip,
    Group,
    ListSkeleton,
    Notice,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { IdpPermissionsTab } from "./idp/IdpPermissionsTab";
import { IdpSettings, providerKind } from "./idp/IdpSettings";
import { ConfirmDialog, FormField, OpenRow, SwitchRow, useServerInfo } from "./idp/shared";

export default function IdentityProviderDetail() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { alias } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const server = useServerInfo();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [idp, setIdp] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [version, setVersion] = useState(0);
    const [tab, setTab] = useState("settings");

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.identityProviders
            .findOne({ alias })
            .then(found => {
                if (!alive) return;
                setIdp(found ?? null);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, alias, attempt]);

    const reload = async () => {
        try {
            const found = await adminClient.identityProviders.findOne({ alias });
            setIdp(found ?? null);
            setVersion(v => v + 1);
        } catch (e) {
            addError(t("sxIdpDetailLoadErrorToast"), e);
        }
    };

    const back = { label: t("sxNavIdentityProviders"), to: `/${realm}/identity-providers` };

    if (status !== "ready" || !idp || server.status !== "ready")
        return (
            <AdminPage title={idp?.displayName || alias || t("sxIdpDetailFallbackTitle")} back={back} width="narrow">
                {(status === "loading" || (status === "ready" && idp && server.status === "loading")) && (
                    <ListSkeleton rows={4} />
                )}
                {status === "error" && (
                    <Notice
                        title={t("sxIdpDetailLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && idp && server.status === "error" && (
                    <Notice
                        title={t("sxIdpDetailServerInfoError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={server.retry}
                    />
                )}
                {status === "ready" && !idp && (
                    <Notice
                        title={t("sxIdpDetailNotFound")}
                        description={t("sxIdpDetailNotFoundDescription")}
                        action={<Button size="sm" onClick={() => navigate(back.to)}>{t("sxIdpDetailBackToList")}</Button>}
                    />
                )}
            </AdminPage>
        );

    const remove = () =>
        confirm({
            title: t("sxIdpDetailDeleteTitle"),
            message: t("sxIdpDetailDeleteMessage", { name: idp.displayName || idp.alias }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.del({ alias });
                    addAlert(t("sxIdpsDeleted"), AlertVariant.success);
                    navigate(`/${realm}/identity-providers`);
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    const kind = providerKind(idp.providerId);
    const showMappers = !kind.isSPIFFE && !kind.isKubernetes && !kind.isJWT;
    const showPermissions =
        server.isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ") && !server.isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ_V2");
    const tabs = [
        { value: "settings", label: t("sxIdpDetailTabSettings") },
        ...(showMappers ? [{ value: "mappers", label: t("sxIdpDetailTabMappers") }] : []),
        ...(showPermissions ? [{ value: "permissions", label: t("sxIdpDetailTabPermissions") }] : [])
    ];
    const current = tabs.some(x => x.value === tab) ? tab : "settings";

    return (
        <AdminPage
            title={idp.displayName || idp.alias}
            description={
                <span className="[overflow-wrap:anywhere]">
                    <span className="font-mono">{idp.alias}</span> · {idp.providerId || "—"}
                </span>
            }
            back={back}
            width="narrow"
            actions={!idp.enabled ? <Chip tone="danger">{t("sxIdpDetailDisabledChip")}</Chip> : undefined}
        >
            {tabs.length > 1 && (
                <SegmentTabs value={current} onChange={setTab} items={tabs} ariaLabel={t("sxCommonSection")} />
            )}

            {current === "settings" && (
                <IdpSettings key={version} idp={idp} server={server} reload={reload} onDelete={remove} />
            )}
            {current === "mappers" && <MappersTab idp={idp} />}
            {current === "permissions" && <IdpPermissionsTab alias={idp.alias} />}

            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </AdminPage>
    );
}

function MappersTab({ idp }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const alias = idp.alias;
    const [mappers, setMappers] = useState<any[]>([]);
    const [types, setTypes] = useState<Record<string, any>>({});
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState<any>(null);
    const [creating, setCreating] = useState(false);

    const fetchAll = () =>
        Promise.all([
            adminClient.identityProviders.findMappers({ alias }),
            adminClient.identityProviders.findMapperTypes({ alias })
        ]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetchAll()
            .then(([list, found]) => {
                if (!alive) return;
                setMappers(Array.isArray(list) ? list : []);
                setTypes(found || {});
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, alias, attempt]);

    const load = async () => {
        try {
            const [list, found] = await fetchAll();
            setMappers(Array.isArray(list) ? list : []);
            setTypes(found || {});
        } catch (e) {
            addError(t("sxIdpDetailMappersLoadErrorToast"), e);
        }
    };

    const typeName = (id: string) => types[id]?.name || id;

    const remove = (m: any) =>
        confirm({
            title: t("sxIdpDetailMapperDeleteTitle"),
            message: t("sxIdpDetailMapperDeleteMessage", { name: m.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.delMapper({ alias, id: m.id });
                    addAlert(t("sxIdpDetailMapperDeleted"), AlertVariant.success);
                    setMappers(mappers.filter(x => x.id !== m.id));
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    return (
        <Section
            label={
                status === "ready"
                    ? t("sxIdpDetailMappersCount", { total: mappers.length })
                    : t("sxIdpDetailTabMappers")
            }
            action={
                status === "ready" && (
                    <TextAction onClick={() => setCreating(true)} disabled={Object.keys(types).length === 0}>
                        {t("sxIdpDetailAddMapper")}
                    </TextAction>
                )
            }
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxIdpDetailMappersLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" && mappers.length === 0 && (
                <Notice
                    title={t("sxIdpDetailMappersEmpty")}
                    description={t("sxIdpDetailMappersEmptyDescription")}
                    action={
                        Object.keys(types).length > 0 && (
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setCreating(true)}>
                                {t("sxIdpDetailAddMapper")}
                            </Button>
                        )
                    }
                />
            )}
            {status === "ready" && mappers.length > 0 && (
                <Group>
                    {mappers.map(m => (
                        <OpenRow
                            key={m.id}
                            testId={`mapper-${m.name}`}
                            onOpen={() => setEditing(m)}
                            title={m.name || "—"}
                            subtitle={typeName(m.identityProviderMapper)}
                            trailing={
                                <TextAction tone="danger" onClick={() => remove(m)}>
                                    {t("sxCommonDelete")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            )}

            {creating && (
                <MapperModal
                    alias={alias}
                    types={types}
                    onClose={() => setCreating(false)}
                    onSaved={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}
            {editing && (
                <MapperModal
                    alias={alias}
                    types={types}
                    mapper={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </Section>
    );
}

function MapperModal({ alias, types, mapper, onClose, onSaved }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const isEdit = !!mapper;

    const typeList = Object.values(types).sort((a: any, b: any) =>
        String(a.name).localeCompare(String(b.name))
    );

    const [name, setName] = useState(mapper?.name || "");
    const [typeId, setTypeId] = useState(
        mapper?.identityProviderMapper || (typeList[0] as any)?.id || ""
    );
    const [config, setConfig] = useState<any>({ ...(mapper?.config || {}) });
    const [saving, setSaving] = useState(false);

    const currentType: any = types[typeId];
    const properties: any[] = currentType?.properties || [];
    const setC = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

    const save = async () => {
        const n = name.trim();
        if (!n || !typeId) return;
        setSaving(true);
        const payload = {
            name: n,
            identityProviderAlias: alias,
            identityProviderMapper: typeId,
            config
        };
        try {
            if (isEdit) {
                await adminClient.identityProviders.updateMapper(
                    { alias, id: mapper.id },
                    { ...payload, id: mapper.id }
                );
                addAlert(t("sxIdpDetailMapperSaved"), AlertVariant.success);
            } else {
                await adminClient.identityProviders.createMapper({
                    alias,
                    identityProviderMapper: payload
                });
                addAlert(t("sxIdpDetailMapperCreated"), AlertVariant.success);
            }
            onSaved();
        } catch (e) {
            addError(isEdit ? t("sxCommonSaveError") : t("sxCommonCreateError"), e);
            setSaving(false);
        }
    };

    const valueOf = (p: any) =>
        config[p.name] ?? (p.defaultValue != null ? String(p.defaultValue) : "");
    const switches = properties.filter(p => /^boolean$/i.test(String(p.type || "")));
    const others = properties.filter(p => !/^boolean$/i.test(String(p.type || "")));

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{isEdit ? t("sxIdpDetailEditMapper") : t("sxIdpDetailAddMapper")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <FormField label={t("sxCommonName")} htmlFor="idp-mapper-name">
                            <Input
                                size="lg"
                                id="idp-mapper-name"
                                autoFocus
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder={t("sxIdpDetailMapperNamePlaceholder")}
                            />
                        </FormField>
                        <FormField
                            label={t("sxIdpDetailMapperType")}
                            htmlFor="idp-mapper-type"
                            hint={currentType?.helpText}
                        >
                            {isEdit ? (
                                <Input
                                    size="lg"
                                    id="idp-mapper-type"
                                    readOnly
                                    value={currentType?.name || typeId}
                                    className="text-muted-foreground"
                                />
                            ) : (
                                <NativeSelect
                                    id="idp-mapper-type"
                                    size="lg"
                                    className="w-full"
                                    value={typeId}
                                    onChange={(e: any) => {
                                        setTypeId(e.target.value);
                                        setConfig({});
                                    }}
                                >
                                    {typeList.map((item: any) => (
                                        <NativeSelectOption key={item.id} value={item.id}>
                                            {item.name}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            )}
                        </FormField>

                        {others.map((p: any) => (
                            <PropertyField
                                key={p.name}
                                prop={p}
                                value={valueOf(p)}
                                onChange={(v: any) => setC(p.name, v)}
                            />
                        ))}

                        {switches.length > 0 && (
                            <Group>
                                {switches.map((p: any) => (
                                    <SwitchRow
                                        key={p.name}
                                        label={p.label || p.name}
                                        hint={p.helpText}
                                        checked={String(valueOf(p)) === "true"}
                                        onChange={(v: boolean) => setC(p.name, v ? "true" : "false")}
                                    />
                                ))}
                            </Group>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || !name.trim() || !typeId} onClick={save}>
                        {saving ? t("sxCommonSaving") : isEdit ? t("sxCommonSave") : t("sxCommonCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function PropertyField({ prop, value, onChange }: any) {
    const t = useT();
    const type = String(prop.type || "String");
    const label = prop.label || prop.name;
    const id = `idp-prop-${prop.name}`;

    if ((type === "List" || type === "Select") && Array.isArray(prop.options) && prop.options.length) {
        return (
            <FormField label={label} htmlFor={id} hint={prop.helpText}>
                <NativeSelect
                    id={id}
                    size="lg"
                    className="w-full"
                    value={value || ""}
                    onChange={(e: any) => onChange(e.target.value)}
                >
                    <NativeSelectOption value="">{t("sxCommonSelectPlaceholder")}</NativeSelectOption>
                    {prop.options.map((o: string) => (
                        <NativeSelectOption key={o} value={o}>
                            {o}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </FormField>
        );
    }

    return (
        <FormField label={label} htmlFor={id} hint={prop.helpText}>
            <Input
                size="lg"
                id={id}
                type={prop.secret ? "password" : "text"}
                value={value}
                onChange={(e: any) => onChange(e.target.value)}
            />
        </FormField>
    );
}
