// @ts-nocheck

import {
    CheckCircleIcon,
    DownloadSimpleIcon,
    ExportIcon,
    PlusIcon,
    XCircleIcon
} from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { CodeBlock, CodeBlockContent } from "@ui/components/code-block";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@ui/components/toggle-group";
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
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    Chip,
    Group,
    ListSkeleton,
    Notice,
    Row as KitRow,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const NONE = "__none__";
const REQUIRED = <span className="text-[#d70015] dark:text-[#ff453a]">*</span>;
const lines = (s: string) =>
    (s || "")
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
const arr = (v: any) => (Array.isArray(v) ? v.join("\n") : "");
const resId = (r: any) => r?._id ?? r?.id;
const asList = (v: any) => (Array.isArray(v) ? v : []);

function ChipPicker({
    options,
    selected,
    onToggle,
    getKey,
    getLabel,
    emptyText,
    loading,
    failed,
    onRetry
}: any) {
    const t = useT();
    const sel: string[] = Array.isArray(selected) ? selected : [];
    if (loading) return <ListSkeleton rows={1} />;
    if (failed) {
        return (
            <Notice
                title={t("sxAuthzOptionsLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={onRetry}
            />
        );
    }
    if (!options || options.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyText ?? t("sxAuthzNoOptions")}</p>;
    }
    const keys = options.map((o: any) => String(getKey(o)));
    return (
        <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            spacing={1.5}
            className="flex-wrap justify-start"
            value={sel.map(String).filter(k => keys.includes(k))}
            onValueChange={(next: string[]) => {
                const cur = sel.map(String);
                options.forEach((o: any) => {
                    const k = getKey(o);
                    if (cur.includes(String(k)) !== next.includes(String(k))) onToggle(k);
                });
            }}
        >
            {options.map((o: any) => {
                const k = getKey(o);
                const on = sel.includes(k);
                return (
                    <ToggleGroupItem key={k} value={String(k)}>
                        {on && <CheckCircleIcon weight="fill" />}
                        {getLabel(o)}
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    );
}

const TABS = [
    { value: "settings", label: "sxAuthzTabSettings" },
    { value: "resources", label: "sxAuthzTabResources" },
    { value: "scopes", label: "sxAuthzTabScopes" },
    { value: "policies", label: "sxAuthzTabPolicies" },
    { value: "permissions", label: "sxAuthzTabPermissions" },
    { value: "evaluate", label: "sxAuthzTabEvaluate" },
    { value: "export", label: "sxAuthzTabExport" }
];

export default function ClientAuthorization({ id }: { id: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [tab, setTab] = useState("settings");

    const shared = { id, realm, adminClient, addAlert, addError };

    return (
        <div className="flex flex-col gap-6">
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxAuthzTabsLabel")}
            />
            {tab === "settings" && <SettingsTab {...shared} />}
            {tab === "resources" && <ResourcesTab {...shared} />}
            {tab === "scopes" && <ScopesTab {...shared} />}
            {tab === "policies" && <PoliciesTab {...shared} />}
            {tab === "permissions" && <PermissionsTab {...shared} />}
            {tab === "evaluate" && <EvaluateTab {...shared} />}
            {tab === "export" && <ExportTab {...shared} />}
        </div>
    );
}

const ENFORCEMENT_MODES = [
    { value: "ENFORCING", label: "sxAuthzEnforcementEnforcing" },
    { value: "PERMISSIVE", label: "sxAuthzEnforcementPermissive" },
    { value: "DISABLED", label: "sxAuthzEnforcementDisabled" }
];
const DECISION_STRATEGIES = [
    { value: "UNANIMOUS", label: "sxAuthzDecisionUnanimous" },
    { value: "AFFIRMATIVE", label: "sxAuthzDecisionAffirmative" },
    { value: "CONSENSUS", label: "sxAuthzDecisionConsensus" }
];

function LoadError({ title, onRetry }: any) {
    const t = useT();
    return <Notice title={title} description={t("sxLoadErrorDescription")} onRetry={onRetry} />;
}

function SettingsTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const rs = await adminClient.clients.getResourceServer({ id });
            if (rs && typeof rs === "object") {
                setSettings(rs);
            } else {
                setSettings(null);
                setFailed(true);
            }
        } catch {
            setSettings(null);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const set = (key: string, value: any) =>
        setSettings((s: any) => ({ ...(s || {}), [key]: value }));

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await adminClient.clients.updateResourceServer({ id }, settings);
            addAlert(t("sxAuthzSettingsSaved"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxAuthzSettingsSaveFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading />;
    if (failed || !settings) return <LoadError title={t("sxAuthzSettingsLoadError")} onRetry={load} />;

    return (
        <>
            <Section label={t("sxAuthzResourceServer")}>
                <Group>
                    <SwitchRow
                        label={t("sxAuthzRemoteResourceManagement")}
                        hint={t("sxAuthzRemoteResourceManagementHint")}
                        checked={!!settings.allowRemoteResourceManagement}
                        onChange={(v: boolean) => set("allowRemoteResourceManagement", v)}
                    />
                    <SettingRow label={t("sxAuthzEnforcementMode")}>
                        <Select
                            value={settings.policyEnforcementMode ?? "ENFORCING"}
                            onValueChange={(v: string) => set("policyEnforcementMode", v)}
                        >
                            <SelectTrigger aria-label={t("sxAuthzEnforcementMode")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {ENFORCEMENT_MODES.map(o => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {t(o.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <SettingRow label={t("sxAuthzDecisionStrategy")}>
                        <Select
                            value={settings.decisionStrategy ?? "UNANIMOUS"}
                            onValueChange={(v: string) => set("decisionStrategy", v)}
                        >
                            <SelectTrigger aria-label={t("sxAuthzDecisionStrategy")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {DECISION_STRATEGIES.map(o => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {t(o.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </Group>
                <Footnote>{t("sxAuthzDecisionStrategyFootnote")}</Footnote>
            </Section>

            <div className="flex justify-end">
                <Button size="form" disabled={saving} onClick={save}>
                    {saving ? t("sxAuthzSaving") : t("sxAuthzSave")}
                </Button>
            </div>
        </>
    );
}

function ResourcesTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [resources, setResources] = useState<any[]>([]);
    const [scopes, setScopes] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [res, scp] = await Promise.all([
                adminClient.clients.listResources({ id }),
                adminClient.clients.listAllScopes({ id })
            ]);
            setResources(asList(res));
            setScopes(asList(scp));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (r: any) =>
        confirm({
            title: t("sxAuthzDeleteResourceTitle"),
            message: t("sxAuthzDeleteResourceMessage", { name: r.name }),
            confirmLabel: t("sxAuthzDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delResource({ id, resourceId: resId(r) });
                    addAlert(t("sxAuthzResourceDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxAuthzResourceDeleteFailed"), err);
                }
            }
        });

    if (loading) return <Loading />;
    if (failed) return <LoadError title={t("sxAuthzResourcesLoadError")} onRetry={load} />;

    const openCreate = () => {
        setEditing(null);
        setOpen(true);
    };

    return (
        <Section
            label={t("sxAuthzResourcesCount", { n: resources.length })}
            action={<CreateButton onClick={openCreate}>{t("sxAuthzCreateResource")}</CreateButton>}
        >
            {resources.length === 0 ? (
                <Notice
                    title={t("sxAuthzNoResourcesTitle")}
                    description={t("sxAuthzNoResourcesDescription")}
                    action={<Button onClick={openCreate}>{t("sxAuthzCreateResource")}</Button>}
                />
            ) : (
                <Group>
                    {resources.map(r => (
                        <OpenRow
                            key={resId(r)}
                            title={r.displayName || r.name}
                            subtitle={
                                r.type ||
                                (Array.isArray(r.uris) && r.uris.length ? r.uris.join(", ") : "—")
                            }
                            onOpen={() => {
                                setEditing(r);
                                setOpen(true);
                            }}
                            onDelete={() => remove(r)}
                        />
                    ))}
                </Group>
            )}

            {open && (
                <ResourceModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    resource={editing}
                    scopes={scopes}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}

function ResourceModal({
    id,
    adminClient,
    addAlert,
    addError,
    resource,
    scopes,
    onClose,
    onSaved
}: any) {
    const t = useT();
    const isEdit = !!resId(resource);
    const [name, setName] = useState(resource?.name ?? "");
    const [displayName, setDisplayName] = useState(resource?.displayName ?? "");
    const [type, setType] = useState(resource?.type ?? "");
    const [uris, setUris] = useState(arr(resource?.uris));
    const [selScopes, setSelScopes] = useState<string[]>(
        (Array.isArray(resource?.scopes) ? resource.scopes : []).map(
            (s: any) => s.name ?? s
        )
    );
    const [saving, setSaving] = useState(false);

    const toggleScope = (k: string) =>
        setSelScopes(prev =>
            prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
        );

    const save = async () => {
        if (!name.trim()) {
            addError(t("sxAuthzResourceNameRequired"), new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep: any = {
                name: name.trim(),
                displayName: displayName.trim() || undefined,
                type: type.trim() || undefined,
                uris: lines(uris),
                scopes: selScopes.map(n => {
                    const found = (scopes || []).find((s: any) => s.name === n);
                    return found ? { id: found.id, name: found.name } : { name: n };
                })
            };
            if (isEdit) {
                await adminClient.clients.updateResource(
                    { id, resourceId: resId(resource) },
                    { ...resource, ...rep }
                );
                addAlert(t("sxAuthzResourceUpdated"), AlertVariant.success);
            } else {
                await adminClient.clients.createResource({ id }, rep);
                addAlert(t("sxAuthzResourceCreated"), AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(
                isEdit ? t("sxAuthzResourceUpdateFailed") : t("sxAuthzResourceCreateFailed"),
                err
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>
                        {isEdit ? t("sxAuthzEditResource") : t("sxAuthzCreateResource")}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>
                                {t("sxAuthzName")} {REQUIRED}
                            </FieldLabel>
                            <Input
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder="resource-name"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxAuthzDisplayName")}</FieldLabel>
                            <Input
                                value={displayName}
                                onChange={(e: any) => setDisplayName(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxAuthzType")}</FieldLabel>
                            <Input
                                value={type}
                                onChange={(e: any) => setType(e.target.value)}
                                placeholder="urn:example:resource"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxAuthzUris")}</FieldLabel>
                            <Textarea
                                rows={3}
                                value={uris}
                                onChange={(e: any) => setUris(e.target.value)}
                                placeholder="/api/resource/*"
                            />
                            <FieldDescription>{t("sxAuthzUrisHint")}</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxAuthzScopes")}</FieldLabel>
                            <ChipPicker
                                options={scopes}
                                selected={selScopes}
                                onToggle={toggleScope}
                                getKey={(s: any) => s.name}
                                getLabel={(s: any) => s.name}
                                emptyText={t("sxAuthzNoScopesDefined")}
                            />
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={save}
                    >
                        {isEdit ? t("sxAuthzSave") : t("sxAuthzCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function ScopesTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [scopes, setScopes] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const list = await adminClient.clients.listAllScopes({ id });
            setScopes(asList(list));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (s: any) =>
        confirm({
            title: t("sxAuthzDeleteScopeTitle"),
            message: t("sxAuthzDeleteScopeMessage", { name: s.name }),
            confirmLabel: t("sxAuthzDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delAuthorizationScope({
                        id,
                        scopeId: s.id
                    });
                    addAlert(t("sxAuthzScopeDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxAuthzScopeDeleteFailed"), err);
                }
            }
        });

    if (loading) return <Loading />;
    if (failed) return <LoadError title={t("sxAuthzScopesLoadError")} onRetry={load} />;

    const openCreate = () => {
        setEditing(null);
        setOpen(true);
    };

    return (
        <Section
            label={t("sxAuthzScopesCount", { n: scopes.length })}
            action={<CreateButton onClick={openCreate}>{t("sxAuthzCreateScope")}</CreateButton>}
        >
            {scopes.length === 0 ? (
                <Notice
                    title={t("sxAuthzNoScopesTitle")}
                    description={t("sxAuthzNoScopesDescription")}
                    action={<Button onClick={openCreate}>{t("sxAuthzCreateScope")}</Button>}
                />
            ) : (
                <Group>
                    {scopes.map(s => (
                        <OpenRow
                            key={s.id}
                            title={s.name}
                            subtitle={s.displayName}
                            onOpen={() => {
                                setEditing(s);
                                setOpen(true);
                            }}
                            onDelete={() => remove(s)}
                        />
                    ))}
                </Group>
            )}

            {open && (
                <ScopeModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    scope={editing}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}

function ScopeModal({
    id,
    adminClient,
    addAlert,
    addError,
    scope,
    onClose,
    onSaved
}: any) {
    const t = useT();
    const isEdit = !!scope?.id;
    const [name, setName] = useState(scope?.name ?? "");
    const [displayName, setDisplayName] = useState(scope?.displayName ?? "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) {
            addError(t("sxAuthzScopeNameRequired"), new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep = {
                name: name.trim(),
                displayName: displayName.trim() || undefined
            };
            if (isEdit) {
                await adminClient.clients.updateAuthorizationScope(
                    { id, scopeId: scope.id },
                    { ...scope, ...rep }
                );
                addAlert(t("sxAuthzScopeUpdated"), AlertVariant.success);
            } else {
                await adminClient.clients.createAuthorizationScope({ id }, rep);
                addAlert(t("sxAuthzScopeCreated"), AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(isEdit ? t("sxAuthzScopeUpdateFailed") : t("sxAuthzScopeCreateFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{isEdit ? t("sxAuthzEditScope") : t("sxAuthzCreateScope")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>
                                {t("sxAuthzName")} {REQUIRED}
                            </FieldLabel>
                            <Input
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder="read"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxAuthzDisplayName")}</FieldLabel>
                            <Input
                                value={displayName}
                                onChange={(e: any) => setDisplayName(e.target.value)}
                            />
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={save}
                    >
                        {isEdit ? t("sxAuthzSave") : t("sxAuthzCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

const POLICY_FIELDS: Record<string, any[]> = {
    role: [{ key: "roles", kind: "roles" }],
    user: [{ key: "users", kind: "users" }],
    group: [
        { key: "groups", kind: "groups" },
        { key: "groupsClaim", kind: "text", label: "sxAuthzFieldGroupsClaim" }
    ],
    client: [{ key: "clients", kind: "clients" }],
    "client-scope": [{ key: "clientScopes", kind: "clientScopes" }],
    time: [
        { key: "nbf", kind: "datetime", label: "sxAuthzFieldNotBefore" },
        { key: "noa", kind: "datetime", label: "sxAuthzFieldNotOnOrAfter" },
        { key: "dayMonth", kind: "text", label: "sxAuthzFieldDayMonthStart" },
        { key: "dayMonthEnd", kind: "text", label: "sxAuthzFieldDayMonthEnd" },
        { key: "month", kind: "text", label: "sxAuthzFieldMonthStart" },
        { key: "monthEnd", kind: "text", label: "sxAuthzFieldMonthEnd" },
        { key: "year", kind: "text", label: "sxAuthzFieldYearStart" },
        { key: "yearEnd", kind: "text", label: "sxAuthzFieldYearEnd" },
        { key: "hour", kind: "text", label: "sxAuthzFieldHourStart" },
        { key: "hourEnd", kind: "text", label: "sxAuthzFieldHourEnd" },
        { key: "minute", kind: "text", label: "sxAuthzFieldMinuteStart" },
        { key: "minuteEnd", kind: "text", label: "sxAuthzFieldMinuteEnd" }
    ],
    regex: [
        { key: "targetClaim", kind: "text", label: "sxAuthzFieldTargetClaim" },
        { key: "pattern", kind: "text", label: "sxAuthzFieldPattern" }
    ],
    aggregate: [{ key: "applyPolicies", kind: "policies" }]
};

const LOGIC_OPTIONS = [
    { value: "POSITIVE", label: "sxAuthzLogicPositive" },
    { value: "NEGATIVE", label: "sxAuthzLogicNegative" }
];
const DECISION_STRAT_OPTIONS = DECISION_STRATEGIES;

const AUX_KINDS = ["roles", "users", "groups", "clients", "clientScopes"];
const EMPTY_AUX = { roles: [], users: [], groups: [], clients: [], clientScopes: [] };

function PoliciesTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [policies, setPolicies] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [aux, setAux] = useState<any>(EMPTY_AUX);
    const [auxLoading, setAuxLoading] = useState(true);
    const [auxFailed, setAuxFailed] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [pol, prov] = await Promise.all([
                adminClient.clients.listPolicies({ id, permission: false }),
                adminClient.clients.listPolicyProviders({ id })
            ]);
            setPolicies(asList(pol));
            setProviders(
                asList(prov).filter((p: any) => p.type !== "resource" && p.type !== "scope")
            );
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    const loadAux = useCallback(async () => {
        setAuxLoading(true);
        setAuxFailed([]);
        const fail = Symbol("fail");
        const results = await Promise.all([
            adminClient.roles.find().catch(() => fail),
            adminClient.users.find({ max: 100 }).catch(() => fail),
            adminClient.groups.find().catch(() => fail),
            adminClient.clients.find().catch(() => fail),
            adminClient.clientScopes.find().catch(() => fail)
        ]);
        const next: any = {};
        const failedKinds: string[] = [];
        AUX_KINDS.forEach((kind, index) => {
            if (results[index] === fail) failedKinds.push(kind);
            next[kind] = asList(results[index]);
        });
        setAux(next);
        setAuxFailed(failedKinds);
        setAuxLoading(false);
    }, [adminClient]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        loadAux();
    }, [loadAux]);

    const remove = (p: any) =>
        confirm({
            title: t("sxAuthzDeletePolicyTitle"),
            message: t("sxAuthzDeletePolicyMessage", { name: p.name }),
            confirmLabel: t("sxAuthzDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPolicy({ id, policyId: p.id });
                    addAlert(t("sxAuthzPolicyDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxAuthzPolicyDeleteFailed"), err);
                }
            }
        });

    if (loading) return <Loading />;
    if (failed) return <LoadError title={t("sxAuthzPoliciesLoadError")} onRetry={load} />;

    const providerItems = providers.map((p: any) => ({
        value: p.type,
        label: p.name || p.type,
        name: p.name
    }));
    const pickProvider = (item: any) => {
        setEditing({ type: item.value, providerName: item.name });
        setOpen(true);
    };

    return (
        <Section
            label={t("sxAuthzPoliciesCount", { n: policies.length })}
            action={
                <CreateMenu
                    label={t("sxAuthzCreatePolicy")}
                    items={providerItems}
                    onPick={pickProvider}
                    emptyLabel={t("sxAuthzNoProviders")}
                    contentClassName="w-56"
                />
            }
        >
            {policies.length === 0 ? (
                <Notice
                    title={t("sxAuthzNoPoliciesTitle")}
                    description={t("sxAuthzNoPoliciesDescription")}
                    action={
                        <CreateMenu
                            large
                            label={t("sxAuthzCreatePolicy")}
                            items={providerItems}
                            onPick={pickProvider}
                            emptyLabel={t("sxAuthzNoProviders")}
                            contentClassName="w-56"
                        />
                    }
                />
            ) : (
                <Group>
                    {policies.map(p => (
                        <OpenRow
                            key={p.id}
                            title={p.name}
                            subtitle={`${p.type}${p.description ? ` · ${p.description}` : ""}`}
                            onOpen={() => {
                                setEditing({ ...p });
                                setOpen(true);
                            }}
                            onDelete={() => remove(p)}
                        />
                    ))}
                </Group>
            )}

            {open && (
                <PolicyModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    policy={editing}
                    aux={{ ...aux, allPolicies: policies }}
                    auxLoading={auxLoading}
                    auxFailed={auxFailed}
                    onRetryAux={loadAux}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}

const NO_FIELDS: any[] = [];

function PolicyModal({
    id,
    adminClient,
    addAlert,
    addError,
    policy,
    aux,
    auxLoading,
    auxFailed,
    onRetryAux,
    onClose,
    onSaved
}: any) {
    const t = useT();
    const isEdit = !!policy?.id;
    const type = policy?.type ?? "";
    const fields = POLICY_FIELDS[type] || NO_FIELDS;
    const [name, setName] = useState(policy?.name ?? "");
    const [description, setDescription] = useState(policy?.description ?? "");
    const [logic, setLogic] = useState(policy?.logic ?? "POSITIVE");
    const [decisionStrategy, setDecisionStrategy] = useState(
        policy?.decisionStrategy ?? "UNANIMOUS"
    );
    const [config, setConfig] = useState<any>(() => initConfig(policy, fields));
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [detailFailed, setDetailFailed] = useState(false);
    const [detailAttempt, setDetailAttempt] = useState(0);
    const [saving, setSaving] = useState(false);

    const policyId = policy?.id;
    useEffect(() => {
        let alive = true;
        if (!isEdit) return;
        setLoadingDetail(true);
        setDetailFailed(false);
        (async () => {
            try {
                const detail = await adminClient.clients.findOnePolicy({
                    id,
                    policyId: policy.id,
                    type
                });
                if (alive && detail) {
                    setConfig(initConfig({ ...policy, ...detail }, fields));
                    if (detail.logic) setLogic(detail.logic);
                    if (detail.decisionStrategy)
                        setDecisionStrategy(detail.decisionStrategy);
                }
            } catch {
                if (alive) setDetailFailed(true);
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [id, isEdit, policyId, type, detailAttempt]);

    const setCfg = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

    const save = async () => {
        if (!name.trim()) {
            addError(t("sxAuthzPolicyNameRequired"), new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep: any = {
                name: name.trim(),
                description: description.trim() || undefined,
                type,
                logic,
                ...buildPolicyPayload(type, fields, config)
            };
            if (type === "aggregate") rep.decisionStrategy = decisionStrategy;
            if (isEdit) {
                await adminClient.clients.updatePolicy(
                    { id, type, policyId: policy.id },
                    { ...policy, ...rep }
                );
                addAlert(t("sxAuthzPolicyUpdated"), AlertVariant.success);
            } else {
                await adminClient.clients.createPolicy({ id, type }, rep);
                addAlert(t("sxAuthzPolicyCreated"), AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(isEdit ? t("sxAuthzPolicyUpdateFailed") : t("sxAuthzPolicyCreateFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    const title = isEdit
        ? t("sxAuthzEditPolicy")
        : t("sxAuthzCreatePolicyTitle", { type: policy?.providerName || type });

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loadingDetail ? (
                        <ListSkeleton rows={3} />
                    ) : detailFailed ? (
                        <LoadError
                            title={t("sxAuthzPolicyDetailLoadError")}
                            onRetry={() => setDetailAttempt(a => a + 1)}
                        />
                    ) : (
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>
                                    {t("sxAuthzName")} {REQUIRED}
                                </FieldLabel>
                                <Input
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxAuthzDescription")}</FieldLabel>
                                <Textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                />
                            </Field>

                            {fields.map(f => (
                                <PolicyField
                                    key={f.key}
                                    field={f}
                                    value={config[f.key]}
                                    onChange={(v: any) => setCfg(f.key, v)}
                                    aux={aux}
                                    auxLoading={auxLoading}
                                    auxFailed={auxFailed}
                                    onRetryAux={onRetryAux}
                                />
                            ))}

                            <Field>
                                <FieldLabel>{t("sxAuthzLogic")}</FieldLabel>
                                <Select value={logic} onValueChange={setLogic}>
                                    <SelectTrigger className="w-full" aria-label={t("sxAuthzLogic")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {LOGIC_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {t(o.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>{t("sxAuthzLogicHint")}</FieldDescription>
                            </Field>

                            {type === "aggregate" && (
                                <Field>
                                    <FieldLabel>{t("sxAuthzDecisionStrategy")}</FieldLabel>
                                    <Select
                                        value={decisionStrategy}
                                        onValueChange={setDecisionStrategy}
                                    >
                                        <SelectTrigger
                                            className="w-full"
                                            aria-label={t("sxAuthzDecisionStrategy")}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {DECISION_STRAT_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>
                                                    {t(o.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving || loadingDetail || detailFailed}
                        onClick={save}
                    >
                        {isEdit ? t("sxAuthzSave") : t("sxAuthzCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function initConfig(policy: any, fields: any[]) {
    const out: any = {};
    const cfg = policy?.config || {};
    fields.forEach(f => {
        if (f.kind === "roles") {
            out[f.key] = (policy?.roles || parseJson(cfg.roles) || []).map(
                (r: any) => r.id ?? r
            );
        } else if (f.kind === "policies") {
            out[f.key] = policy?.policies || parseJson(cfg.applyPolicies) || [];
        } else if (["users", "groups", "clients", "clientScopes"].includes(f.kind)) {
            const raw = policy?.[f.key] ?? cfg[f.key];
            out[f.key] = Array.isArray(raw) ? raw : parseJson(raw) || [];
        } else {
            out[f.key] = policy?.[f.key] ?? cfg[f.key] ?? "";
        }
    });
    return out;
}

function parseJson(v: any) {
    if (Array.isArray(v)) return v;
    if (typeof v !== "string") return null;
    try {
        return JSON.parse(v);
    } catch {
        return null;
    }
}

function buildPolicyPayload(_type: string, fields: any[], config: any) {
    const out: any = {};
    fields.forEach(f => {
        const v = config[f.key];
        if (f.kind === "roles") {
            out.roles = (v || []).map((rid: string) => ({ id: rid, required: false }));
        } else if (f.kind === "policies") {
            out.policies = v || [];
        } else if (["users", "groups", "clients", "clientScopes"].includes(f.kind)) {
            out[f.key] = v || [];
        } else if (f.kind === "datetime") {
            if (v) out[f.key] = v;
        } else {
            if (v !== "" && v != null) out[f.key] = v;
        }
    });
    return out;
}

const PICKER_FIELDS: Record<string, any> = {
    roles: {
        label: "sxAuthzRoles",
        empty: "sxAuthzNoRoles",
        getKey: (r: any) => r.id,
        getLabel: (r: any) => r.name
    },
    users: {
        label: "sxAuthzUsers",
        empty: "sxAuthzNoUsers",
        getKey: (u: any) => u.id,
        getLabel: (u: any) => u.username
    },
    groups: {
        label: "sxAuthzGroups",
        empty: "sxAuthzNoGroups",
        getKey: (g: any) => g.id,
        getLabel: (g: any) => g.name
    },
    clients: {
        label: "sxAuthzClients",
        empty: "sxAuthzNoClients",
        getKey: (c: any) => c.id,
        getLabel: (c: any) => c.clientId
    },
    clientScopes: {
        label: "sxAuthzClientScopes",
        empty: "sxAuthzNoClientScopes",
        getKey: (c: any) => c.id,
        getLabel: (c: any) => c.name
    },
    policies: {
        label: "sxAuthzApplyPolicies",
        empty: "sxAuthzNoPolicyOptions",
        getKey: (p: any) => p.id,
        getLabel: (p: any) => p.name
    }
};

function PolicyField({ field, value, onChange, aux, auxLoading, auxFailed, onRetryAux }: any) {
    const t = useT();
    const toggle = (k: string) => {
        const cur: string[] = Array.isArray(value) ? value : [];
        onChange(cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]);
    };

    const picker = PICKER_FIELDS[field.kind];
    if (picker) {
        const isAux = AUX_KINDS.includes(field.kind);
        return (
            <Field>
                <FieldLabel>{t(picker.label)}</FieldLabel>
                <ChipPicker
                    options={field.kind === "policies" ? aux.allPolicies : aux[field.kind]}
                    selected={value}
                    onToggle={toggle}
                    getKey={picker.getKey}
                    getLabel={picker.getLabel}
                    emptyText={t(picker.empty)}
                    loading={isAux && auxLoading}
                    failed={isAux && !auxLoading && (auxFailed || []).includes(field.kind)}
                    onRetry={onRetryAux}
                />
            </Field>
        );
    }

    return (
        <Field>
            {field.label && <FieldLabel>{t(field.label)}</FieldLabel>}
            <Input
                type={field.kind === "datetime" ? "datetime-local" : undefined}
                value={value || ""}
                onChange={(e: any) => onChange(e.target.value)}
            />
        </Field>
    );
}

const PERMISSION_TYPES = [
    { value: "resource", label: "sxAuthzPermissionTypeResource" },
    { value: "scope", label: "sxAuthzPermissionTypeScope" }
];

function PermissionsTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [scopes, setScopes] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [perms, res, scp, pol] = await Promise.all([
                adminClient.clients.findPermissions({ id }),
                adminClient.clients.listResources({ id }),
                adminClient.clients.listAllScopes({ id }),
                adminClient.clients.listPolicies({ id, permission: false })
            ]);
            setPermissions(asList(perms));
            setResources(asList(res));
            setScopes(asList(scp));
            setPolicies(asList(pol));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (p: any) =>
        confirm({
            title: t("sxAuthzDeletePermissionTitle"),
            message: t("sxAuthzDeletePermissionMessage", { name: p.name }),
            confirmLabel: t("sxAuthzDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPermission({
                        id,
                        type: p.type,
                        permissionId: p.id
                    });
                    addAlert(t("sxAuthzPermissionDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxAuthzPermissionDeleteFailed"), err);
                }
            }
        });
    if (loading) return <Loading />;
    if (failed) return <LoadError title={t("sxAuthzPermissionsLoadError")} onRetry={load} />;

    const typeItems = PERMISSION_TYPES.map(pt => ({ value: pt.value, label: t(pt.label) }));
    const pickType = (item: any) => {
        setEditing({ type: item.value });
        setOpen(true);
    };
    const subtitleOf = (p: any) => {
        const scope = p.type === "scope";
        if (p.description) {
            return t(
                scope ? "sxAuthzPermissionSubtitleScope" : "sxAuthzPermissionSubtitleResource",
                { description: p.description }
            );
        }
        return t(scope ? "sxAuthzPermissionTypeScope" : "sxAuthzPermissionTypeResource");
    };

    return (
        <Section
            label={t("sxAuthzPermissionsCount", { n: permissions.length })}
            action={
                <CreateMenu
                    label={t("sxAuthzCreatePermission")}
                    items={typeItems}
                    onPick={pickType}
                    contentClassName="w-48"
                />
            }
        >
            {permissions.length === 0 ? (
                <Notice
                    title={t("sxAuthzNoPermissionsTitle")}
                    description={t("sxAuthzNoPermissionsDescription")}
                    action={
                        <CreateMenu
                            large
                            label={t("sxAuthzCreatePermission")}
                            items={typeItems}
                            onPick={pickType}
                            contentClassName="w-48"
                        />
                    }
                />
            ) : (
                <Group>
                    {permissions.map(p => (
                        <OpenRow
                            key={p.id}
                            title={p.name}
                            subtitle={subtitleOf(p)}
                            onOpen={() => {
                                setEditing({ ...p });
                                setOpen(true);
                            }}
                            onDelete={() => remove(p)}
                        />
                    ))}
                </Group>
            )}

            {open && (
                <PermissionModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    permission={editing}
                    resources={resources}
                    scopes={scopes}
                    policies={policies}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}

function PermissionModal({
    id,
    adminClient,
    addAlert,
    addError,
    permission,
    resources,
    scopes,
    policies,
    onClose,
    onSaved
}: any) {
    const t = useT();
    const isEdit = !!permission?.id;
    const type = permission?.type || "resource";
    const [name, setName] = useState(permission?.name ?? "");
    const [description, setDescription] = useState(permission?.description ?? "");
    const [decisionStrategy, setDecisionStrategy] = useState(
        permission?.decisionStrategy ?? "UNANIMOUS"
    );
    const [selResources, setSelResources] = useState<string[]>([]);
    const [selScopes, setSelScopes] = useState<string[]>([]);
    const [selPolicies, setSelPolicies] = useState<string[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [detailFailed, setDetailFailed] = useState(false);
    const [detailAttempt, setDetailAttempt] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        if (!isEdit) return;
        setLoadingDetail(true);
        setDetailFailed(false);
        (async () => {
            try {
                const [res, scp, pol] = await Promise.all([
                    adminClient.clients.getAssociatedResources({
                        id,
                        permissionId: permission.id
                    }),
                    adminClient.clients.getAssociatedScopes({ id, permissionId: permission.id }),
                    adminClient.clients.getAssociatedPolicies({ id, permissionId: permission.id })
                ]);
                if (!alive) return;
                setSelResources(asList(res).map((r: any) => resId(r)));
                setSelScopes(asList(scp).map((s: any) => s.id));
                setSelPolicies(asList(pol).map((p: any) => p.id));
            } catch {
                if (alive) setDetailFailed(true);
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [isEdit, permission.id, id, detailAttempt]);

    const toggle = (setter: any) => (k: string) =>
        setter((cur: string[]) =>
            cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]
        );

    const save = async () => {
        if (!name.trim()) {
            addError(t("sxAuthzPermissionNameRequired"), new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep: any = {
                name: name.trim(),
                description: description.trim() || undefined,
                type,
                decisionStrategy,
                policies: selPolicies
            };
            if (type === "resource") {
                rep.resources = selResources;
            } else {
                rep.scopes = selScopes;
                if (selResources.length) rep.resources = selResources;
            }
            if (isEdit) {
                await adminClient.clients.updatePermission(
                    { id, type, permissionId: permission.id },
                    { ...permission, ...rep }
                );
                addAlert(t("sxAuthzPermissionUpdated"), AlertVariant.success);
            } else {
                await adminClient.clients.createPermission({ id, type }, rep);
                addAlert(t("sxAuthzPermissionCreated"), AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(
                isEdit ? t("sxAuthzPermissionUpdateFailed") : t("sxAuthzPermissionCreateFailed"),
                err
            );
        } finally {
            setSaving(false);
        }
    };

    const title =
        type === "scope"
            ? isEdit
                ? t("sxAuthzEditScopePermissionTitle")
                : t("sxAuthzCreateScopePermissionTitle")
            : isEdit
              ? t("sxAuthzEditResourcePermissionTitle")
              : t("sxAuthzCreateResourcePermissionTitle");

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loadingDetail ? (
                        <ListSkeleton rows={3} />
                    ) : detailFailed ? (
                        <LoadError
                            title={t("sxAuthzPermissionDetailLoadError")}
                            onRetry={() => setDetailAttempt(a => a + 1)}
                        />
                    ) : (
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>
                                    {t("sxAuthzName")} {REQUIRED}
                                </FieldLabel>
                                <Input
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxAuthzDescription")}</FieldLabel>
                                <Textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                />
                            </Field>

                            {type === "scope" ? (
                                <>
                                    <Field>
                                        <FieldLabel>
                                            {t("sxAuthzScopes")} {REQUIRED}
                                        </FieldLabel>
                                        <ChipPicker
                                            options={scopes}
                                            selected={selScopes}
                                            onToggle={toggle(setSelScopes)}
                                            getKey={(s: any) => s.id}
                                            getLabel={(s: any) => s.name}
                                            emptyText={t("sxAuthzNoScopeOptions")}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxAuthzResourcesOptional")}</FieldLabel>
                                        <ChipPicker
                                            options={resources}
                                            selected={selResources}
                                            onToggle={toggle(setSelResources)}
                                            getKey={(r: any) => resId(r)}
                                            getLabel={(r: any) => r.displayName || r.name}
                                            emptyText={t("sxAuthzNoResourceOptions")}
                                        />
                                    </Field>
                                </>
                            ) : (
                                <Field>
                                    <FieldLabel>
                                        {t("sxAuthzResources")} {REQUIRED}
                                    </FieldLabel>
                                    <ChipPicker
                                        options={resources}
                                        selected={selResources}
                                        onToggle={toggle(setSelResources)}
                                        getKey={(r: any) => resId(r)}
                                        getLabel={(r: any) => r.displayName || r.name}
                                        emptyText={t("sxAuthzNoResourceOptions")}
                                    />
                                </Field>
                            )}

                            <Field>
                                <FieldLabel>{t("sxAuthzPolicies")}</FieldLabel>
                                <ChipPicker
                                    options={policies}
                                    selected={selPolicies}
                                    onToggle={toggle(setSelPolicies)}
                                    getKey={(p: any) => p.id}
                                    getLabel={(p: any) => p.name}
                                    emptyText={t("sxAuthzCreatePolicyFirst")}
                                />
                            </Field>

                            <Field>
                                <FieldLabel>{t("sxAuthzDecisionStrategy")}</FieldLabel>
                                <Select
                                    value={decisionStrategy}
                                    onValueChange={setDecisionStrategy}
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        aria-label={t("sxAuthzDecisionStrategy")}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {DECISION_STRAT_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {t(o.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>{t("sxAuthzPermissionDecisionHint")}</FieldDescription>
                            </Field>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving || loadingDetail || detailFailed}
                        onClick={save}
                    >
                        {isEdit ? t("sxAuthzSave") : t("sxAuthzCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function EvaluateTab({ id, adminClient, addError }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [resources, setResources] = useState<any[]>([]);
    const [scopes, setScopes] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    const [selResources, setSelResources] = useState<string[]>([]);
    const [selScopes, setSelScopes] = useState<string[]>([]);
    const [selRoles, setSelRoles] = useState<string[]>([]);
    const [clientId, setClientId] = useState(NONE);

    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [userId, setUserId] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchFailed, setSearchFailed] = useState(false);
    const [searchedEmpty, setSearchedEmpty] = useState(false);
    const [running, setRunning] = useState(false);
    const [evalFailed, setEvalFailed] = useState(false);
    const [result, setResult] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [res, scp, rls, cls] = await Promise.all([
                adminClient.clients.listResources({ id }),
                adminClient.clients.listAllScopes({ id }),
                adminClient.roles.find(),
                adminClient.clients.find()
            ]);
            setResources(asList(res));
            setScopes(asList(scp));
            setRoles(asList(rls));
            setClients(asList(cls));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = (setter: any) => (k: string) =>
        setter((cur: string[]) =>
            cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]
        );

    const searchUsers = async () => {
        setSearching(true);
        setSearchFailed(false);
        setSearchedEmpty(false);
        try {
            const list = await adminClient.users.find({
                search: userSearch.trim() || undefined,
                max: 10
            });
            const found = asList(list);
            setUsers(found);
            setSearchedEmpty(found.length === 0);
        } catch {
            setUsers([]);
            setSearchFailed(true);
        } finally {
            setSearching(false);
        }
    };

    const evaluate = async () => {
        if (!userId) {
            addError(t("sxAuthzSelectUserRequired"), new Error("userId"));
            return;
        }
        setRunning(true);
        setEvalFailed(false);
        setResult(null);
        try {
            const selectedResources = resources
                .filter(r => selResources.includes(resId(r)))
                .map(r => ({
                    _id: resId(r),
                    name: r.name,
                    scopes: selScopes.length
                        ? scopes
                              .filter(s => selScopes.includes(s.id))
                              .map(s => ({ id: s.id, name: s.name }))
                        : r.scopes
                }));
            const evalRequest: any = {
                roleIds: selRoles,
                userId,
                clientId: clientId === NONE ? id : clientId,
                resources: selectedResources.length ? selectedResources : undefined,
                entitlements: false,
                context: { attributes: {} }
            };
            const res = await adminClient.clients.evaluateResource({ id }, evalRequest);
            setResult(res ?? {});
        } catch {
            setEvalFailed(true);
        } finally {
            setRunning(false);
        }
    };

    if (loading) return <Loading />;
    if (failed) return <LoadError title={t("sxAuthzEvaluateLoadError")} onRetry={load} />;

    const granted = result && String(result.status).toUpperCase() === "PERMIT";

    return (
        <>
            <Section label={t("sxAuthzIdentity")}>
                <Group>
                    <StackRow label={t("sxAuthzSearchUser")}>
                        <div className="flex gap-2">
                            <SearchField
                                className="min-w-0 flex-1"
                                value={userSearch}
                                onChange={setUserSearch}
                                onEnter={searchUsers}
                                placeholder={t("sxAuthzUserSearchPlaceholder")}
                            />
                            <Button
                                variant="secondary"
                                className="h-13.5 rounded-xl px-5 text-[15px] font-medium"
                                disabled={searching}
                                onClick={searchUsers}
                            >
                                {searching ? t("sxAuthzSearching") : t("sxAuthzSearch")}
                            </Button>
                        </div>
                    </StackRow>
                    {users.length > 0 && (
                        <SettingRow label={t("sxAuthzUser")}>
                            <Select
                                value={userId || NONE}
                                onValueChange={(v: string) => setUserId(v === NONE ? "" : v)}
                            >
                                <SelectTrigger aria-label={t("sxAuthzUser")} className="max-w-full">
                                    <SelectValue placeholder={t("sxAuthzSelectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value={NONE}>{t("sxAuthzSelectPlaceholder")}</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.username}
                                            {u.email ? ` (${u.email})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </SettingRow>
                    )}
                    <SettingRow label={t("sxAuthzClientAudience")}>
                        <Select value={clientId} onValueChange={setClientId}>
                            <SelectTrigger aria-label={t("sxAuthzClient")} className="max-w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value={NONE}>{t("sxAuthzThisClient")}</SelectItem>
                                {clients.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.clientId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <StackRow label={t("sxAuthzRoles")} hint={t("sxAuthzRolesHint")}>
                        <ChipPicker
                            options={roles}
                            selected={selRoles}
                            onToggle={toggle(setSelRoles)}
                            getKey={(r: any) => r.id}
                            getLabel={(r: any) => r.name}
                            emptyText={t("sxAuthzNoRoles")}
                        />
                    </StackRow>
                </Group>
                {searching && (
                    <div className="mt-3">
                        <ListSkeleton rows={2} />
                    </div>
                )}
                {!searching && searchFailed && (
                    <div className="mt-3">
                        <LoadError title={t("sxAuthzUserSearchError")} onRetry={searchUsers} />
                    </div>
                )}
                {!searching && searchedEmpty && (
                    <div className="mt-3">
                        <Notice
                            title={t("sxAuthzNoUsersFoundTitle")}
                            description={t("sxAuthzNoUsersFoundDescription")}
                        />
                    </div>
                )}
            </Section>

            <Section label={t("sxAuthzPermissionsSection")}>
                <Group>
                    <StackRow label={t("sxAuthzResources")}>
                        <ChipPicker
                            options={resources}
                            selected={selResources}
                            onToggle={toggle(setSelResources)}
                            getKey={(r: any) => resId(r)}
                            getLabel={(r: any) => r.displayName || r.name}
                            emptyText={t("sxAuthzNoResourceOptions")}
                        />
                    </StackRow>
                    <StackRow label={t("sxAuthzScopes")}>
                        <ChipPicker
                            options={scopes}
                            selected={selScopes}
                            onToggle={toggle(setSelScopes)}
                            getKey={(s: any) => s.id}
                            getLabel={(s: any) => s.name}
                            emptyText={t("sxAuthzNoScopeOptions")}
                        />
                    </StackRow>
                </Group>
                <Footnote>{t("sxAuthzEvaluateFootnote")}</Footnote>
            </Section>

            <div className="flex justify-end">
                <Button size="form" disabled={running} onClick={evaluate}>
                    {running ? t("sxAuthzEvaluating") : t("sxAuthzEvaluate")}
                </Button>
            </div>

            <Section label={t("sxAuthzResult")}>
                {running ? (
                    <ListSkeleton rows={2} />
                ) : evalFailed ? (
                    <LoadError title={t("sxAuthzEvaluateError")} onRetry={evaluate} />
                ) : !result ? (
                    <Notice
                        title={t("sxAuthzResultEmptyTitle")}
                        description={t("sxAuthzResultEmptyDescription")}
                    />
                ) : (
                    <Group>
                        <KitRow
                            leading={<StatusIcon permit={!!granted} />}
                            title={granted ? t("sxAuthzResultPermit") : t("sxAuthzResultDeny")}
                            subtitle={t("sxAuthzOverallDecision", { status: result.status || "—" })}
                        />
                        {(result.results || []).map((r: any, i: number) => {
                            const permit = String(r.status).toUpperCase() === "PERMIT";
                            return (
                                <KitRow
                                    key={i}
                                    leading={<StatusIcon permit={permit} />}
                                    title={r.resource?.name || t("sxAuthzResultGeneral")}
                                    subtitle={
                                        (r.allowedScopes || r.scopes || [])
                                            .map((s: any) => s.name ?? s)
                                            .join(", ") || "—"
                                    }
                                    trailing={<Chip tone={permit ? "success" : "danger"}>{r.status}</Chip>}
                                />
                            );
                        })}
                    </Group>
                )}
            </Section>
        </>
    );
}

function ExportTab({ id, adminClient, addAlert }: any) {
    const t = useT();
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [data, setData] = useState<any>(null);

    const run = async () => {
        setLoading(true);
        setFailed(false);
        try {
            const res = await adminClient.clients.exportResource({ id });
            setData(res ?? {});
        } catch {
            setData(null);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    const download = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${id}-authz.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        addAlert(t("sxAuthzDownloaded"), AlertVariant.success);
    };

    return (
        <Section label={t("sxAuthzExportConfiguration")}>
            <Group>
                <KitRow
                    leading={<ExportIcon className="size-6 text-primary" />}
                    title={loading ? t("sxAuthzExporting") : t("sxAuthzExportConfiguration")}
                    subtitle={t("sxAuthzExportSubtitle")}
                    onClick={loading ? undefined : run}
                    className={loading ? "opacity-50" : undefined}
                />
                {data && (
                    <KitRow
                        leading={<DownloadSimpleIcon className="size-6 text-primary" />}
                        title={t("sxAuthzDownloadJson")}
                        subtitle={`${id}-authz.json`}
                        onClick={download}
                    />
                )}
            </Group>
            <Footnote>{t("sxAuthzExportFootnote")}</Footnote>

            <div className="mt-6">
                {loading ? (
                    <Loading />
                ) : failed ? (
                    <LoadError title={t("sxAuthzExportError")} onRetry={run} />
                ) : data ? (
                    <CodeBlock size="sm">
                        <CodeBlockContent className="max-h-120 scroll-fade-y">
                            {JSON.stringify(data, null, 2)}
                        </CodeBlockContent>
                    </CodeBlock>
                ) : (
                    <Notice
                        title={t("sxAuthzNotExportedTitle")}
                        description={t("sxAuthzNotExportedDescription")}
                    />
                )}
            </div>
        </Section>
    );
}

function CreateMenu({ label, items, onPick, emptyLabel, contentClassName, large }: any) {
    const [open, setOpen] = useState(false);
    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                {large ? <Button>{label}</Button> : <CreateButton>{label}</CreateButton>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align={large ? "center" : "end"} className={contentClassName}>
                {items.length === 0 && emptyLabel && (
                    <DropdownMenuItem disabled>{emptyLabel}</DropdownMenuItem>
                )}
                {items.map((item: any) => (
                    <DropdownMenuItem key={item.value} onClick={() => onPick(item)}>
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
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
                    {state?.message && (
                        <ConfirmDescription>{state.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxAuthzCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? t("sxAuthzConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

function Loading() {
    return <ListSkeleton />;
}

function Footnote({ children }: any) {
    return <p className="mt-2 px-4 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}

function RowText({ label, hint }: any) {
    return (
        <div className="min-w-0">
            <div className="text-base font-medium">{label}</div>
            {hint && <div className="mt-0.5 text-[13px] text-muted-foreground">{hint}</div>}
        </div>
    );
}

function SettingRow({ label, hint, children }: any) {
    return (
        <li className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <RowText label={label} hint={hint} />
            <div className="flex min-w-0 max-w-full justify-end">{children}</div>
        </li>
    );
}

function StackRow({ label, hint, children }: any) {
    return (
        <li className="px-4 py-3.5">
            {(label || hint) && <RowText label={label} hint={hint} />}
            <div className={label || hint ? "mt-3" : ""}>{children}</div>
        </li>
    );
}

function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <li className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
            <RowText label={label} hint={hint} />
            <Switch
                checked={!!checked}
                disabled={disabled}
                aria-label={typeof label === "string" ? label : undefined}
                onCheckedChange={(v: boolean) => onChange(v)}
            />
        </li>
    );
}

function OpenRow({ title, subtitle, onOpen, onDelete }: any) {
    const t = useT();
    return (
        <li className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
            <button
                type="button"
                onClick={onOpen}
                className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
            >
                <span className="w-full truncate text-base font-medium">{title}</span>
                {subtitle && (
                    <span className="mt-0.5 w-full truncate text-[13px] text-muted-foreground">
                        {subtitle}
                    </span>
                )}
            </button>
            <TextAction tone="danger" onClick={onDelete}>
                {t("sxAuthzDelete")}
            </TextAction>
        </li>
    );
}

function CreateButton({ onClick, children, ...rest }: any) {
    return (
        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={onClick} {...rest}>
            <PlusIcon />
            {children}
        </Button>
    );
}

function StatusIcon({ permit }: { permit: boolean }) {
    return permit ? (
        <CheckCircleIcon weight="fill" className="size-6 text-[#248a3d] dark:text-[#32d74b]" />
    ) : (
        <XCircleIcon weight="fill" className="size-6 text-[#d70015] dark:text-[#ff453a]" />
    );
}
