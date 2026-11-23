// @ts-nocheck

import { CaretLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
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
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { type ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import ConfigForm from "../components/ConfigForm";
import {
    AdminPage,
    Group,
    ListSkeleton,
    Notice,
    Row,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const TABS = [
    { value: "settings", label: "sxClientScopeDetailTabSettings" },
    { value: "mappers", label: "sxClientScopeDetailTabMappers" }
];

const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

export default function ClientScopeDetail() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const [scope, setScope] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [tab, setTab] = useState("settings");

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.clientScopes
            .findOne({ id })
            .then(s => {
                if (!alive) return;
                setScope(s ?? null);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, id, attempt]);

    const reload = async () => {
        try {
            const s = await adminClient.clientScopes.findOne({ id });
            setScope(s ?? null);
        } catch (e) {
            addError(t("sxClientScopeDetailLoadErrorToast"), e);
        }
    };

    const back = { label: t("sxNavClientScopes"), to: `/${realm}/client-scopes` };

    if (status !== "ready" || !scope)
        return (
            <AdminPage title={scope?.name || t("sxClientScopeDetailFallbackTitle")} back={back} width="narrow">
                {status === "loading" && <ListSkeleton rows={4} />}
                {status === "error" && (
                    <Notice
                        title={t("sxClientScopeDetailLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && (
                    <Notice
                        title={t("sxClientScopeDetailNotFound")}
                        description={t("sxClientScopeDetailNotFoundDescription")}
                        action={<Button size="sm" onClick={() => navigate(back.to)}>{t("sxClientScopeDetailBackToList")}</Button>}
                    />
                )}
            </AdminPage>
        );

    return (
        <AdminPage
            title={scope.name}
            description={<span className="font-mono text-[15px]">{scope.protocol || "openid-connect"}</span>}
            back={back}
            width="narrow"
        >
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxCommonSection")}
            />

            {tab === "settings" && (
                <SettingsTab
                    scope={scope}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/client-scopes`)}
                />
            )}
            {tab === "mappers" && <MappersTab scope={scope} />}
        </AdminPage>
    );
}

function initialForm(scope: any) {
    const attrs = scope.attributes || {};
    return {
        name: scope.name || "",
        description: scope.description || "",
        protocol: scope.protocol || "openid-connect",
        onConsent: attrs["display.on.consent.screen"] === "true",
        consentText: attrs["consent.screen.text"] || "",
        inToken: attrs["include.in.token.scope"] !== "false",
        guiOrder: attrs["gui.order"] || ""
    };
}

function SettingsTab({ scope, reload, onDeleted }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [f, setF] = useState(() => initialForm(scope));
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);
    const dirty = JSON.stringify(f) !== JSON.stringify(initialForm(scope));

    const save = async () => {
        const name = f.name.trim();
        if (!name) return;
        setSaving(true);
        try {
            const attributes: any = {
                ...(scope.attributes || {}),
                "display.on.consent.screen": f.onConsent ? "true" : "false",
                "include.in.token.scope": f.inToken ? "true" : "false"
            };
            if (f.onConsent && f.consentText.trim())
                attributes["consent.screen.text"] = f.consentText.trim();
            else delete attributes["consent.screen.text"];
            if (f.guiOrder.toString().trim())
                attributes["gui.order"] = f.guiOrder.toString().trim();
            else delete attributes["gui.order"];

            await adminClient.clientScopes.update(
                { id: scope.id },
                {
                    ...scope,
                    name,
                    description: f.description.trim() || undefined,
                    protocol: f.protocol,
                    attributes
                }
            );
            addAlert(t("sxClientScopeDetailSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: t("sxClientScopeDetailDeleteTitle"),
            message: t("sxClientScopeDetailDeleteMessage", { name: scope.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clientScopes.del({ id: scope.id });
                    addAlert(t("sxClientScopesDeleted"), AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    return (
        <>
            <Section label={t("sxCommonGeneral")}>
                <div className="flex flex-col gap-4">
                    <Field size="lg">
                        <FieldLabel htmlFor="scope-name">{t("sxCommonName")}</FieldLabel>
                        <Input
                            size="lg"
                            id="scope-name"
                            value={f.name}
                            aria-invalid={!f.name.trim() || undefined}
                            onChange={(e: any) => set("name", e.target.value)}
                            placeholder={t("sxClientScopeDetailNamePlaceholder")}
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="scope-description">{t("sxCommonDescription")}</FieldLabel>
                        <Textarea
                            size="lg"
                            id="scope-description"
                            value={f.description}
                            onChange={(e: any) => set("description", e.target.value)}
                            placeholder={t("sxClientScopeDetailDescriptionPlaceholder")}
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="scope-protocol">{t("sxCommonProtocol")}</FieldLabel>
                        <NativeSelect
                            id="scope-protocol"
                            size="lg"
                            className="w-full"
                            value={f.protocol}
                            onChange={(e: any) => set("protocol", e.target.value)}
                        >
                            <NativeSelectOption value="openid-connect">openid-connect</NativeSelectOption>
                            <NativeSelectOption value="saml">saml</NativeSelectOption>
                        </NativeSelect>
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="scope-gui-order">{t("sxClientScopeDetailGuiOrder")}</FieldLabel>
                        <Input
                            size="lg"
                            id="scope-gui-order"
                            value={f.guiOrder}
                            onChange={(e: any) => set("guiOrder", e.target.value)}
                            placeholder={t("sxClientScopeDetailGuiOrderPlaceholder")}
                        />
                    </Field>
                </div>
            </Section>

            <Section label={t("sxClientScopeDetailConsentSection")}>
                <div className="flex flex-col gap-4">
                    <Group>
                        <SwitchRow
                            label={t("sxClientScopeDetailOnConsent")}
                            hint={t("sxClientScopeDetailOnConsentHint")}
                            checked={f.onConsent}
                            onChange={(v: boolean) => set("onConsent", v)}
                        />
                        <SwitchRow
                            label={t("sxClientScopeDetailInToken")}
                            hint={t("sxClientScopeDetailInTokenHint")}
                            checked={f.inToken}
                            onChange={(v: boolean) => set("inToken", v)}
                        />
                    </Group>
                    {f.onConsent && (
                        <Field size="lg">
                            <FieldLabel htmlFor="scope-consent-text">{t("sxClientScopeDetailConsentText")}</FieldLabel>
                            <Input
                                size="lg"
                                id="scope-consent-text"
                                value={f.consentText}
                                onChange={(e: any) => set("consentText", e.target.value)}
                                placeholder="${profile}"
                            />
                        </Field>
                    )}
                    <p className="px-0.5 text-[13px] text-muted-foreground">
                        {t("sxClientScopeDetailAttributesNote")}
                    </p>
                </div>
            </Section>

            <div className="flex flex-col gap-1.5">
                <Button size="form" block disabled={saving || !f.name.trim()} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
                <Button
                    variant="plain"
                    size="form"
                    block
                    disabled={saving || !dirty}
                    onClick={() => setF(initialForm(scope))}
                >
                    {t("sxCommonCancel")}
                </Button>
            </div>

            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxClientScopeDetailDeleteNote")}
                </p>
                <Button size="form" block className={DANGER_BUTTON} onClick={remove}>
                    {t("sxClientScopeDetailDeleteTitle")}
                </Button>
            </section>
            {confirmNode}
        </>
    );
}

function MappersTab({ scope }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const id = scope.id;
    const protocol = scope.protocol || "openid-connect";

    const [mappers, setMappers] = useState<any[]>([]);
    const [serverInfo, setServerInfo] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const fetchAll = () =>
        Promise.all([
            adminClient.clientScopes.listProtocolMappers({ id }),
            adminClient.serverInfo.find()
        ]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetchAll()
            .then(([m, si]) => {
                if (!alive) return;
                setMappers(Array.isArray(m) ? m : []);
                setServerInfo(si);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, id, attempt]);

    const load = async () => {
        try {
            const [m, si] = await fetchAll();
            setMappers(Array.isArray(m) ? m : []);
            setServerInfo(si);
        } catch (e) {
            addError(t("sxClientScopeDetailMappersLoadErrorToast"), e);
        }
    };

    const mapperTypes: any[] = serverInfo?.protocolMapperTypes?.[protocol] || [];
    const builtins: any[] = serverInfo?.builtinProtocolMappers?.[protocol] || [];

    const deleteMapper = (m: any) =>
        confirm({
            title: t("sxClientScopeDetailMapperDeleteTitle"),
            message: t("sxClientScopeDetailMapperDeleteMessage", { name: m.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clientScopes.delProtocolMapper({
                        id,
                        mapperId: m.id
                    });
                    addAlert(t("sxClientScopeDetailMapperDeleted"), AlertVariant.success);
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
                    ? t("sxClientScopeDetailMappersCount", { total: mappers.length })
                    : t("sxClientScopeDetailTabMappers")
            }
            action={status === "ready" && <TextAction onClick={() => setAdding(true)}>{t("sxCommonAdd")}</TextAction>}
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxClientScopeDetailMappersLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" && mappers.length === 0 && (
                <Notice
                    title={t("sxClientScopeDetailMappersEmpty")}
                    description={t("sxClientScopeDetailMappersEmptyDescription")}
                    action={
                        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setAdding(true)}>
                            {t("sxCommonAdd")}
                        </Button>
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
                            title={m.name}
                            subtitle={m.protocolMapper}
                            trailing={
                                <TextAction tone="danger" onClick={() => deleteMapper(m)}>
                                    {t("sxCommonDelete")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            )}

            {adding && (
                <AddMapperModal
                    id={id}
                    protocol={protocol}
                    mapperTypes={mapperTypes}
                    builtins={builtins}
                    existing={mappers}
                    onClose={() => setAdding(false)}
                    onDone={() => {
                        setAdding(false);
                        load();
                    }}
                />
            )}
            {editing && (
                <EditMapperModal
                    id={id}
                    mapper={editing}
                    mapperTypes={mapperTypes}
                    onClose={() => setEditing(null)}
                    onDone={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}

function configToForm(config: any) {
    const out: any = {};
    Object.entries(config || {}).forEach(([k, v]: any) => {
        if (Array.isArray(v)) out[k] = v.map(String);
        else if (typeof v === "string" && v.includes("##")) out[k] = v.split("##");
        else out[k] = [String(v ?? "")];
    });
    return out;
}
function formToConfig(form: any) {
    const config: any = {};
    for (const [k, v] of Object.entries(form || {})) {
        config[k] = Array.isArray(v)
            ? v.length <= 1
                ? (v[0] ?? "")
                : v.join("##")
            : String(v ?? "");
    }
    return config;
}

function AddMapperModal({
    id,
    protocol,
    mapperTypes,
    builtins,
    existing,
    onClose,
    onDone
}: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [view, setView] = useState("choose");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickedType, setPickedType] = useState<any>(null);
    const [name, setName] = useState("");
    const [config, setConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const existingNames = new Set((existing || []).map((m: any) => m.name));
    const availBuiltins = (builtins || []).filter((b: any) => !existingNames.has(b.name));
    const filteredBuiltins = availBuiltins.filter((b: any) =>
        (b.name || "").toLowerCase().includes(search.toLowerCase())
    );
    const filteredTypes = (mapperTypes || []).filter((type: any) =>
        (type.name || "").toLowerCase().includes(search.toLowerCase())
    );

    const toggleSel = (n: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(n) ? next.delete(n) : next.add(n);
            return next;
        });

    const addPredefined = async () => {
        const reps = availBuiltins
            .filter((b: any) => selected.has(b.name))
            .map((b: any) => ({ ...b, id: undefined }));
        if (!reps.length) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.addMultipleProtocolMappers({ id }, reps);
            addAlert(t("sxClientScopeDetailMappersAdded", { total: reps.length }), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxCommonAddError"), e);
            setSaving(false);
        }
    };

    const saveNew = async () => {
        if (!name.trim() || !pickedType) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.addProtocolMapper(
                { id },
                {
                    name: name.trim(),
                    protocol,
                    protocolMapper: pickedType.id,
                    config: formToConfig(config)
                }
            );
            addAlert(t("sxClientScopeDetailMapperAdded"), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxCommonAddError"), e);
            setSaving(false);
        }
    };

    const SubBack = ({ to, children }: any) => (
        <TextAction
            className="inline-flex items-center gap-1"
            onClick={() => {
                setSearch("");
                setView(to);
            }}
        >
            <CaretLeftIcon className="size-3.5 rtl:rotate-180" />
            {children}
        </TextAction>
    );

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxClientScopeDetailAddMapper")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                {view === "choose" ? (
                    <Group>
                        <Row
                            title={t("sxClientScopeDetailAddPredefined")}
                            subtitle={t("sxClientScopeDetailAddPredefinedHint")}
                            onClick={() => {
                                setSearch("");
                                setSelected(new Set());
                                setView("predefined");
                            }}
                        />
                        <Row
                            title={t("sxClientScopeDetailConfigureNew")}
                            subtitle={t("sxClientScopeDetailConfigureNewHint")}
                            onClick={() => {
                                setSearch("");
                                setView("pickType");
                            }}
                        />
                    </Group>
                ) : view === "predefined" ? (
                    <div className="space-y-3">
                        <SubBack to="choose">{t("sxCommonBack")}</SubBack>
                        <SearchField value={search} onChange={setSearch} placeholder={t("sxClientScopeDetailSearchMappers")} />
                        <div className="max-h-72 overflow-y-auto">
                            {filteredBuiltins.length === 0 ? (
                                <Notice
                                    title={search.trim() ? t("sxClientScopeDetailNoMatchingMappers") : t("sxClientScopeDetailNoPredefined")}
                                    description={search.trim() ? t("sxCommonTryDifferentSearch") : t("sxClientScopeDetailNoPredefinedDescription")}
                                />
                            ) : (
                                <Group>
                                    {filteredBuiltins.map((b: any) => (
                                        <li key={b.name}>
                                            <button
                                                type="button"
                                                aria-pressed={selected.has(b.name)}
                                                onClick={() => toggleSel(b.name)}
                                                className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                                            >
                                                <span className="min-w-0 truncate text-base">{b.name}</span>
                                                {selected.has(b.name) && (
                                                    <CheckIcon weight="bold" className="size-4 shrink-0 text-primary" />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </Group>
                            )}
                        </div>
                        <Button
                            size="form"
                            block
                            disabled={saving || selected.size === 0}
                            onClick={addPredefined}
                        >
                            {saving
                                ? t("sxCommonAdding")
                                : selected.size > 0
                                  ? t("sxCommonAddWithCount", { total: selected.size })
                                  : t("sxCommonAdd")}
                        </Button>
                    </div>
                ) : view === "pickType" ? (
                    <div className="space-y-3">
                        <SubBack to="choose">{t("sxCommonBack")}</SubBack>
                        <SearchField value={search} onChange={setSearch} placeholder={t("sxClientScopeDetailSearchMapperTypes")} />
                        <div className="max-h-72 overflow-y-auto">
                            {filteredTypes.length === 0 ? (
                                <Notice
                                    title={search.trim() ? t("sxClientScopeDetailNoMatchingTypes") : t("sxClientScopeDetailNoTypes")}
                                    description={search.trim() ? t("sxCommonTryDifferentSearch") : t("sxClientScopeDetailNoTypesDescription")}
                                />
                            ) : (
                                <Group>
                                    {filteredTypes.map((type: any) => (
                                        <Row
                                            key={type.id}
                                            className="min-h-13"
                                            title={type.name}
                                            subtitle={type.category}
                                            onClick={() => {
                                                setPickedType(type);
                                                setName(type.name || "");
                                                setConfig({});
                                                setView("config");
                                            }}
                                        />
                                    ))}
                                </Group>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <SubBack to="pickType">{pickedType?.name}</SubBack>
                        <Field size="lg">
                            <FieldLabel htmlFor="scope-mapper-name">{t("sxCommonName")}</FieldLabel>
                            <Input
                                size="lg"
                                id="scope-mapper-name"
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder={t("sxClientScopeDetailMapperNamePlaceholder")}
                            />
                        </Field>
                        <ConfigForm
                            properties={pickedType?.properties}
                            value={config}
                            onChange={(n: string, v: string[]) =>
                                setConfig((c: any) => ({ ...c, [n]: v }))
                            }
                        />
                        <Button
                            size="form"
                            block
                            disabled={saving || !name.trim()}
                            onClick={saveNew}
                        >
                            {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                        </Button>
                    </div>
                )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function EditMapperModal({ id, mapper, mapperTypes, onClose, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const type = (mapperTypes || []).find((item: any) => item.id === mapper.protocolMapper);
    const [name, setName] = useState(mapper.name || "");
    const [config, setConfig] = useState<any>(configToForm(mapper.config));
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.updateProtocolMapper(
                { id, mapperId: mapper.id },
                { ...mapper, name: name.trim(), config: formToConfig(config) }
            );
            addAlert(t("sxClientScopeDetailMapperUpdated"), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxCommonUpdateError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxClientScopeDetailEditMapper")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                <Field size="lg">
                    <FieldLabel htmlFor="scope-mapper-edit-name">{t("sxCommonName")}</FieldLabel>
                    <Input
                        size="lg"
                        id="scope-mapper-edit-name"
                        value={name}
                        onChange={(e: any) => setName(e.target.value)}
                        placeholder={t("sxClientScopeDetailMapperNamePlaceholder")}
                    />
                </Field>
                <Field size="lg">
                    <FieldLabel htmlFor="scope-mapper-edit-type">{t("sxCommonType")}</FieldLabel>
                    <Input
                        size="lg"
                        id="scope-mapper-edit-type"
                        readOnly
                        value={type?.name || mapper.protocolMapper}
                        className="text-muted-foreground"
                    />
                </Field>
                <ConfigForm
                    properties={type?.properties}
                    value={config}
                    onChange={(n: string, v: string[]) =>
                        setConfig((c: any) => ({ ...c, [n]: v }))
                    }
                />
                <Button
                    size="form"
                    block
                    disabled={saving || !name.trim()}
                    onClick={save}
                >
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function useConfirmDialog() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<any>(null);
    const confirm = (opts: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setState(opts);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{state?.title}</ConfirmTitle>
                    {state?.message && <ConfirmDescription>{state.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <div className="text-base">{label}</div>
                {hint && <div className="mt-0.5 text-[13px] text-muted-foreground">{hint}</div>}
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

function OpenRow({ title, subtitle, onOpen, trailing, testId }: any) {
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
