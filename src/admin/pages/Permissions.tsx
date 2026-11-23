// @ts-nocheck

import { CaretDownIcon, CaretRightIcon, CheckCircleIcon, PlusIcon, XCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
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
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    AdminPage,
    Chip,
    Group,
    ListSkeleton,
    Notice,
    Row,
    Section,
    SearchField,
    SegmentTabs,
    SEPARATOR,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const ADMIN_PERMISSIONS_CLIENT_ID = "admin-permissions";
const REQUIRED = <span className="text-[#d70015] dark:text-[#ff453a]"> *</span>;

export default function Permissions() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();

    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [v2On, setV2On] = useState(false);
    const [realmEnabled, setRealmEnabled] = useState(false);
    const [client, setClient] = useState<any>(null);
    const [tab, setTab] = useState("permissions");

    const detect = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [serverInfo, realmRep] = await Promise.all([
                adminClient.serverInfo.find(),
                adminClient.realms.findOne({ realm })
            ]);
            const features = Array.isArray(serverInfo?.features) ? serverInfo.features : [];
            const v2 = features.some(
                (f: any) => f?.name === "ADMIN_FINE_GRAINED_AUTHZ_V2" && f?.enabled
            );
            const rEnabled = !!realmRep?.adminPermissionsEnabled;
            setV2On(v2);
            setRealmEnabled(rEnabled);

            if (v2 && rEnabled) {
                const clients = await adminClient.clients.find({
                    clientId: ADMIN_PERMISSIONS_CLIENT_ID
                });
                setClient(Array.isArray(clients) ? (clients[0] ?? null) : null);
            } else {
                setClient(null);
            }
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, realm]);

    useEffect(() => {
        detect();
    }, [detect]);

    const pageTitle = t("sxPermissionsPageTitle");
    const pageDescription = t("sxPermissionsPageDescription");

    if (loading) {
        return (
            <AdminPage title={pageTitle} description={pageDescription}>
                <ListSkeleton />
            </AdminPage>
        );
    }

    if (failed) {
        return (
            <AdminPage title={pageTitle} description={pageDescription}>
                <Notice
                    title={t("sxPermissionsLoadErrorTitle")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={detect}
                />
            </AdminPage>
        );
    }

    if (!v2On || !realmEnabled || !client) {
        const statusLabel = (on: boolean) =>
            on ? t("sxPermissionsStatusEnabled") : t("sxPermissionsStatusDisabled");
        return (
            <AdminPage title={pageTitle} description={pageDescription}>
                <Notice
                    title={t("sxPermissionsUnavailableTitle")}
                    description={
                        !v2On
                            ? t("sxPermissionsUnavailableFeature")
                            : !realmEnabled
                              ? t("sxPermissionsUnavailableRealm")
                              : t("sxPermissionsUnavailableClient")
                    }
                />
                {(!v2On || !realmEnabled) && (
                    <Section label={t("sxPermissionsRequirements")}>
                        <Group>
                            <Row
                                title={t("sxPermissionsFeatureFlag")}
                                subtitle={
                                    <code className="font-mono text-[13px]">
                                        admin-fine-grained-authz:v2
                                    </code>
                                }
                                trailing={
                                    <Chip tone={v2On ? "success" : "warning"}>
                                        {statusLabel(v2On)}
                                    </Chip>
                                }
                            />
                            <Row
                                title={t("sxPermissionsRealmSetting")}
                                subtitle={t("sxPermissionsRealmSettingPath")}
                                trailing={
                                    <Chip tone={realmEnabled ? "success" : "warning"}>
                                        {statusLabel(realmEnabled)}
                                    </Chip>
                                }
                            />
                        </Group>
                        <Footnote>{t("sxPermissionsRequirementsFootnote")}</Footnote>
                    </Section>
                )}
            </AdminPage>
        );
    }

    const clientPk = client.id;

    return (
        <AdminPage title={pageTitle} description={pageDescription}>
            <SegmentTabs
                value={tab}
                onChange={setTab}
                ariaLabel={pageTitle}
                items={[
                    { value: "permissions", label: t("sxPermissionsTabPermissions") },
                    { value: "policies", label: t("sxPermissionsTabPolicies") },
                    { value: "evaluate", label: t("sxPermissionsTabEvaluate") }
                ]}
            />

            {tab === "permissions" && (
                <PermissionsTab
                    clientPk={clientPk}
                    adminClient={adminClient}
                    realm={realm}
                    addAlert={addAlert}
                    addError={addError}
                    confirm={confirm}
                />
            )}
            {tab === "policies" && (
                <PoliciesTab
                    clientPk={clientPk}
                    adminClient={adminClient}
                    realm={realm}
                    addAlert={addAlert}
                    addError={addError}
                    confirm={confirm}
                />
            )}
            {tab === "evaluate" && (
                <EvaluateTab
                    clientPk={clientPk}
                    adminClient={adminClient}
                    realm={realm}
                    addError={addError}
                />
            )}
            {confirmNode}
        </AdminPage>
    );
}

function Footnote({ children }: { children?: ReactNode }) {
    return <p className="mt-2 px-4 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}

function Caption({ children }: { children?: ReactNode }) {
    return <h3 className="mb-2 px-0.5 text-sm font-medium text-muted-foreground">{children}</h3>;
}

function CreateButton({ onClick, children }: any) {
    return (
        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={onClick}>
            <PlusIcon />
            {children}
        </Button>
    );
}

function useResourceTypes(adminClient: any, clientPk: string) {
    const [types, setTypes] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setTypes(null);
        setFailed(false);
        adminClient.clients
            .getResourceServer({ id: clientPk })
            .then((rs: any) => {
                const raw = rs?.authorizationSchema?.resourceTypes;
                const list = (Array.isArray(raw) ? raw : Object.values(raw || {})).sort(
                    (a: any, b: any) => (a?.type || "").localeCompare(b?.type || "")
                );
                if (alive) setTypes(list);
            })
            .catch(() => {
                if (alive) setFailed(true);
            });
        return () => {
            alive = false;
        };
    }, [adminClient, clientPk, attempt]);
    const reload = useCallback(() => setAttempt(a => a + 1), []);
    return { types, failed, loading: !failed && types === null, reload };
}

function ResourceTypesState({ state }: any) {
    const t = useT();
    if (state.loading) return <ListSkeleton rows={1} />;
    if (state.failed) {
        return (
            <Notice
                title={t("sxPermissionsResourceTypesLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={state.reload}
            />
        );
    }
    if ((state.types || []).length === 0) {
        return (
            <Notice
                title={t("sxPermissionsNoResourceTypesTitle")}
                description={t("sxPermissionsNoResourceTypesDescription")}
            />
        );
    }
    return null;
}

function PermissionsTab({ clientPk, adminClient, realm, addAlert, addError, confirm }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [createOpen, setCreateOpen] = useState(false);
    const resourceTypes = useResourceTypes(adminClient, clientPk);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const perms = await adminClient.clients.listPermissionScope({ id: clientPk });
            const list = Array.isArray(perms) ? perms : [];
            const enriched = await Promise.all(
                list.map(async (p: any) => {
                    const [policies, scopes, resources] = await Promise.all([
                        adminClient.clients.getAssociatedPolicies({
                            id: clientPk,
                            permissionId: p.id
                        }),
                        adminClient.clients.getAssociatedScopes({
                            id: clientPk,
                            permissionId: p.id
                        }),
                        adminClient.clients.getAssociatedResources({
                            id: clientPk,
                            permissionId: p.id
                        })
                    ]);
                    return {
                        ...p,
                        policies: Array.isArray(policies) ? policies : [],
                        scopes: Array.isArray(scopes) ? scopes : [],
                        resources: Array.isArray(resources) ? resources : []
                    };
                })
            );
            setItems(enriched);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, clientPk]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (p: any) =>
        confirm({
            title: t("sxPermissionsDeletePermissionTitle"),
            message: t("sxPermissionsDeletePermissionMessage", { name: p.name }),
            confirmLabel: t("sxPermissionsDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPermission({
                        id: clientPk,
                        type: p.type,
                        permissionId: p.id
                    });
                    addAlert(t("sxPermissionsPermissionDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxPermissionsPermissionDeleteFailed"), err);
                }
            }
        });

    const ready = !loading && !failed;

    return (
        <Section
            label={t("sxPermissionsTabPermissions")}
            action={
                ready &&
                items.length > 0 && (
                    <CreateButton onClick={() => setCreateOpen(true)}>
                        {t("sxPermissionsCreatePermission")}
                    </CreateButton>
                )
            }
        >
            {loading && <ListSkeleton />}
            {!loading && failed && (
                <Notice
                    title={t("sxPermissionsPermissionsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={load}
                />
            )}
            {ready && items.length === 0 && (
                <Notice
                    title={t("sxPermissionsNoPermissionsTitle")}
                    description={t("sxPermissionsNoPermissionsDescription")}
                    action={
                        <Button onClick={() => setCreateOpen(true)}>
                            {t("sxPermissionsCreatePermission")}
                        </Button>
                    }
                />
            )}
            {ready && items.length > 0 && (
                <>
                    <Group>
                        {items.map(p => {
                            const open = !!expanded[p.id];
                            const Caret = open ? CaretDownIcon : CaretRightIcon;
                            return (
                                <li key={p.id}>
                                    <div className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
                                        <button
                                            type="button"
                                            aria-expanded={open}
                                            onClick={() =>
                                                setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))
                                            }
                                            className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
                                        >
                                            <Caret
                                                weight="bold"
                                                className={`size-3.5 shrink-0 text-muted-foreground ${open ? "" : "rtl:rotate-180"}`}
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-base font-medium">
                                                    {p.name}
                                                </span>
                                                <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                    {p.resourceType || "—"}
                                                    {p.scopes?.length
                                                        ? ` · ${p.scopes.map((s: any) => s.name).join(", ")}`
                                                        : ""}
                                                </span>
                                            </span>
                                        </button>
                                        <TextAction tone="danger" onClick={() => remove(p)}>
                                            {t("sxPermissionsDelete")}
                                        </TextAction>
                                    </div>
                                    {open && (
                                        <>
                                            <div aria-hidden className={SEPARATOR} />
                                            <div className="px-4 py-3 ps-10.5 text-sm">
                                                {p.description && (
                                                    <p className="mb-2 text-muted-foreground">
                                                        {p.description}
                                                    </p>
                                                )}
                                                <DetailLine
                                                    label={t("sxPermissionsResources")}
                                                    value={
                                                        p.resources?.length
                                                            ? p.resources
                                                                  .map((r: any) => r.name)
                                                                  .join(", ")
                                                            : t("sxPermissionsAllResources")
                                                    }
                                                />
                                                <DetailLine
                                                    label={t("sxPermissionsScopes")}
                                                    value={
                                                        p.scopes?.map((s: any) => s.name).join(", ") ||
                                                        "—"
                                                    }
                                                />
                                                <DetailLine
                                                    label={t("sxPermissionsTabPolicies")}
                                                    value={
                                                        p.policies
                                                            ?.map((pol: any) => pol.name)
                                                            .join(", ") || "—"
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </Group>
                    <Footnote>{t("sxPermissionsPermissionsFootnote")}</Footnote>
                </>
            )}

            {createOpen && (
                <PermissionModal
                    clientPk={clientPk}
                    adminClient={adminClient}
                    resourceTypes={resourceTypes}
                    addAlert={addAlert}
                    addError={addError}
                    onClose={() => setCreateOpen(false)}
                    onSaved={async () => {
                        setCreateOpen(false);
                        await load();
                    }}
                />
            )}
        </Section>
    );
}

function DetailLine({ label, value }: any) {
    return (
        <p className="flex gap-2 py-0.5">
            <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{value}</span>
        </p>
    );
}

function PermissionModal({
    clientPk,
    adminClient,
    resourceTypes,
    addAlert,
    addError,
    onClose,
    onSaved
}: any) {
    const t = useT();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [resourceType, setResourceType] = useState("");
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
    const [policies, setPolicies] = useState<any[] | null>(null);
    const [policiesFailed, setPoliciesFailed] = useState(false);
    const [policiesAttempt, setPoliciesAttempt] = useState(0);
    const [saving, setSaving] = useState(false);

    const types = resourceTypes.types || [];
    const current = useMemo(
        () => types.find((rt: any) => rt.type === resourceType),
        [types, resourceType]
    );
    const scopeOptions = current?.scopes || [];
    const firstType = types[0]?.type || "";

    useEffect(() => {
        if (!resourceType && firstType) setResourceType(firstType);
    }, [firstType, resourceType]);

    useEffect(() => {
        let alive = true;
        setPolicies(null);
        setPoliciesFailed(false);
        adminClient.clients
            .listPolicies({ id: clientPk, permission: false })
            .then((res: any) => {
                if (alive) setPolicies(Array.isArray(res) ? res : []);
            })
            .catch(() => {
                if (alive) setPoliciesFailed(true);
            });
        return () => {
            alive = false;
        };
    }, [adminClient, clientPk, policiesAttempt]);

    const toggle = (list: string[], setList: any, v: string) =>
        setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

    const save = async () => {
        if (!name.trim()) {
            addError(t("sxPermissionsPermissionNameRequired"), new Error("name"));
            return;
        }
        if (!resourceType) {
            addError(t("sxPermissionsResourceTypeRequired"), new Error("resourceType"));
            return;
        }
        setSaving(true);
        try {
            await adminClient.clients.createPermission(
                { id: clientPk, type: "scope" },
                {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    resourceType,
                    scopes: selectedScopes,
                    policies: selectedPolicies
                }
            );
            addAlert(t("sxPermissionsPermissionCreated"), AlertVariant.success);
            await onSaved();
        } catch (err) {
            addError(t("sxPermissionsPermissionCreateFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    const typesReady = !resourceTypes.loading && !resourceTypes.failed && types.length > 0;

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxPermissionsCreatePermission")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>
                                {t("sxPermissionsName")}
                                {REQUIRED}
                            </FieldLabel>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="manage-users"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxPermissionsDescription")}</FieldLabel>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                resizable="inside"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>
                                {t("sxPermissionsResourceType")}
                                {REQUIRED}
                            </FieldLabel>
                            {typesReady ? (
                                <Select value={resourceType} onValueChange={setResourceType}>
                                    <SelectTrigger
                                        className="w-full"
                                        aria-label={t("sxPermissionsResourceType")}
                                    >
                                        <SelectValue placeholder={t("sxPermissionsSelectType")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {types.map((rt: any) => (
                                            <SelectItem key={rt.type} value={rt.type}>
                                                {rt.type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <ResourceTypesState state={resourceTypes} />
                            )}
                        </Field>

                        {scopeOptions.length > 0 && (
                            <div>
                                <Caption>{t("sxPermissionsAuthorizationScopes")}</Caption>
                                <Group>
                                    {scopeOptions.map((s: string) => (
                                        <CheckRow
                                            key={s}
                                            label={s}
                                            checked={selectedScopes.includes(s)}
                                            onToggle={() =>
                                                toggle(selectedScopes, setSelectedScopes, s)
                                            }
                                        />
                                    ))}
                                </Group>
                            </div>
                        )}

                        <div>
                            <Caption>{t("sxPermissionsTabPolicies")}</Caption>
                            {policiesFailed ? (
                                <Notice
                                    title={t("sxPermissionsPoliciesLoadError")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={() => setPoliciesAttempt(a => a + 1)}
                                />
                            ) : policies === null ? (
                                <ListSkeleton rows={2} />
                            ) : policies.length === 0 ? (
                                <Notice
                                    title={t("sxPermissionsNoAssignablePoliciesTitle")}
                                    description={t("sxPermissionsNoAssignablePoliciesDescription")}
                                />
                            ) : (
                                <Group>
                                    {policies.map((pol: any) => (
                                        <CheckRow
                                            key={pol.id}
                                            label={pol.name}
                                            hint={pol.type}
                                            checked={selectedPolicies.includes(pol.id)}
                                            onToggle={() =>
                                                toggle(selectedPolicies, setSelectedPolicies, pol.id)
                                            }
                                        />
                                    ))}
                                </Group>
                            )}
                        </div>
                    </FieldGroup>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving} onClick={save}>
                        {saving ? t("sxPermissionsSaving") : t("sxPermissionsCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function CheckRow({ label, hint, checked, onToggle }: any) {
    return (
        <li>
            <label className="flex min-h-13 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
                <Checkbox checked={!!checked} onCheckedChange={() => onToggle()} />
                <span className="min-w-0">
                    <span className="block truncate text-base">{label}</span>
                    {hint && (
                        <span className="block truncate text-[13px] text-muted-foreground">
                            {hint}
                        </span>
                    )}
                </span>
            </label>
        </li>
    );
}

function PoliciesTab({ clientPk, adminClient, realm, addAlert, addError, confirm }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [pols, provs] = await Promise.all([
                adminClient.clients.listPolicies({ id: clientPk, permission: false }),
                adminClient.clients.listPolicyProviders({ id: clientPk })
            ]);
            setItems(Array.isArray(pols) ? pols : []);
            setProviders(
                (Array.isArray(provs) ? provs : []).filter(
                    (p: any) => !["resource", "scope", "uma"].includes(p.type)
                )
            );
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, clientPk]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (pol: any) =>
        confirm({
            title: t("sxPermissionsDeletePolicyTitle"),
            message: t("sxPermissionsDeletePolicyMessage", { name: pol.name }),
            confirmLabel: t("sxPermissionsDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPolicy({
                        id: clientPk,
                        policyId: pol.id
                    });
                    addAlert(t("sxPermissionsPolicyDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxPermissionsPolicyDeleteFailed"), err);
                }
            }
        });

    const ready = !loading && !failed;

    return (
        <Section
            label={t("sxPermissionsTabPolicies")}
            action={
                ready &&
                items.length > 0 && (
                    <CreateButton onClick={() => setCreateOpen(true)}>
                        {t("sxPermissionsCreatePolicy")}
                    </CreateButton>
                )
            }
        >
            {loading && <ListSkeleton />}
            {!loading && failed && (
                <Notice
                    title={t("sxPermissionsPoliciesLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={load}
                />
            )}
            {ready && items.length === 0 && (
                <Notice
                    title={t("sxPermissionsNoPoliciesTitle")}
                    description={t("sxPermissionsNoPoliciesDescription")}
                    action={
                        <Button onClick={() => setCreateOpen(true)}>
                            {t("sxPermissionsCreatePolicy")}
                        </Button>
                    }
                />
            )}
            {ready && items.length > 0 && (
                <>
                    <Group>
                        {items.map(pol => (
                            <Row
                                key={pol.id}
                                title={pol.name}
                                subtitle={`${pol.type}${pol.description ? ` · ${pol.description}` : ""}`}
                                trailing={
                                    <TextAction tone="danger" onClick={() => remove(pol)}>
                                        {t("sxPermissionsDelete")}
                                    </TextAction>
                                }
                            />
                        ))}
                    </Group>
                    <Footnote>{t("sxPermissionsPoliciesFootnote")}</Footnote>
                </>
            )}

            {createOpen && (
                <PolicyModal
                    clientPk={clientPk}
                    adminClient={adminClient}
                    providers={providers}
                    addAlert={addAlert}
                    addError={addError}
                    onClose={() => setCreateOpen(false)}
                    onSaved={async () => {
                        setCreateOpen(false);
                        await load();
                    }}
                />
            )}
        </Section>
    );
}

function PolicyModal({ clientPk, adminClient, providers, addAlert, addError, onClose, onSaved }: any) {
    const t = useT();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState(providers?.[0]?.type || "");
    const [logic, setLogic] = useState("POSITIVE");
    const [saving, setSaving] = useState(false);
    const firstProvider = providers?.[0]?.type || "";

    useEffect(() => {
        if (!type && firstProvider) setType(firstProvider);
    }, [firstProvider, type]);

    const save = async () => {
        if (!name.trim()) {
            addError(t("sxPermissionsPolicyNameRequired"), new Error("name"));
            return;
        }
        if (!type) {
            addError(t("sxPermissionsPolicyTypeRequired"), new Error("type"));
            return;
        }
        setSaving(true);
        try {
            await adminClient.clients.createPolicy(
                { id: clientPk, type },
                {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    type,
                    logic,
                    decisionStrategy: "UNANIMOUS"
                }
            );
            addAlert(t("sxPermissionsPolicyCreated"), AlertVariant.success);
            await onSaved();
        } catch (err) {
            addError(t("sxPermissionsPolicyCreateFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxPermissionsCreatePolicy")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>
                                {t("sxPermissionsName")}
                                {REQUIRED}
                            </FieldLabel>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="only-admins"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxPermissionsDescription")}</FieldLabel>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                resizable="inside"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>
                                {t("sxPermissionsPolicyType")}
                                {REQUIRED}
                            </FieldLabel>
                            {(providers || []).length === 0 ? (
                                <Notice
                                    title={t("sxPermissionsNoProvidersTitle")}
                                    description={t("sxPermissionsNoProvidersDescription")}
                                />
                            ) : (
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger
                                        className="w-full"
                                        aria-label={t("sxPermissionsPolicyType")}
                                    >
                                        <SelectValue placeholder={t("sxPermissionsSelectType")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map((p: any) => (
                                            <SelectItem key={p.type} value={p.type}>
                                                {p.name || p.type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <FieldDescription>{t("sxPermissionsPolicyTypeHint")}</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxPermissionsLogic")}</FieldLabel>
                            <Select value={logic} onValueChange={setLogic}>
                                <SelectTrigger className="w-full" aria-label={t("sxPermissionsLogic")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="POSITIVE">{t("sxPermissionsLogicPositive")}</SelectItem>
                                    <SelectItem value="NEGATIVE">{t("sxPermissionsLogicNegative")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving} onClick={save}>
                        {saving ? t("sxPermissionsSaving") : t("sxPermissionsCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function EvaluateTab({ clientPk, adminClient, realm, addError }: any) {
    const t = useT();
    const resourceTypes = useResourceTypes(adminClient, clientPk);

    const [userQuery, setUserQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [userId, setUserId] = useState("");
    const [userLabel, setUserLabel] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchFailed, setSearchFailed] = useState(false);
    const [searchedEmpty, setSearchedEmpty] = useState(false);

    const [resourceType, setResourceType] = useState("");
    const [scopes, setScopes] = useState<string[]>([]);
    const [resourceName, setResourceName] = useState("");

    const [roleIds] = useState<string[]>([]);

    const [running, setRunning] = useState(false);
    const [evalFailed, setEvalFailed] = useState(false);
    const [result, setResult] = useState<any>(null);

    const types = resourceTypes.types || [];
    const current = useMemo(
        () => types.find((rt: any) => rt.type === resourceType),
        [types, resourceType]
    );
    const scopeOptions = current?.scopes || [];
    const firstType = types[0]?.type || "";

    useEffect(() => {
        if (!resourceType && firstType) setResourceType(firstType);
    }, [firstType, resourceType]);

    useEffect(() => {
        setScopes([]);
    }, [resourceType]);

    const searchUsers = async () => {
        setSearching(true);
        setSearchFailed(false);
        setSearchedEmpty(false);
        try {
            const list = await adminClient.users.find({
                search: userQuery.trim() || undefined,
                max: 10
            });
            const found = Array.isArray(list) ? list : [];
            setUsers(found);
            setSearchedEmpty(found.length === 0);
        } catch {
            setUsers([]);
            setSearchFailed(true);
        } finally {
            setSearching(false);
        }
    };

    const toggleScope = (s: string) =>
        setScopes(list => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]));

    const evaluate = async () => {
        if (!userId) {
            addError(t("sxPermissionsSelectUserRequired"), new Error("user"));
            return;
        }
        if (!resourceType) {
            addError(t("sxPermissionsResourceTypeRequired"), new Error("resourceType"));
            return;
        }
        setRunning(true);
        setEvalFailed(false);
        setResult(null);
        try {
            const payload = {
                roleIds,
                userId,
                resourceType,
                resources: [
                    {
                        name: resourceName.trim() || undefined,
                        scopes: scopes.map(s => ({ name: s }))
                    }
                ],
                entitlements: false,
                context: { attributes: {} }
            };
            const res = await adminClient.clients.evaluateResource({ id: clientPk, realm }, payload);
            setResult(res ?? {});
        } catch {
            setEvalFailed(true);
        } finally {
            setRunning(false);
        }
    };

    const typesReady = !resourceTypes.loading && !resourceTypes.failed && types.length > 0;

    return (
        <>
            <Section label={t("sxPermissionsSubject")}>
                <Group>
                    <li className="px-4 py-3.5">
                        <div className="text-base font-medium">{t("sxPermissionsUser")}</div>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {t("sxPermissionsUserHint")}
                        </p>
                        <div className="mt-3 flex gap-2">
                            <SearchField
                                className="min-w-0 flex-1"
                                value={userQuery}
                                onChange={setUserQuery}
                                onEnter={searchUsers}
                                placeholder={t("sxPermissionsUserSearchPlaceholder")}
                            />
                            <Button
                                variant="secondary"
                                className="h-13.5 rounded-xl px-5 text-[15px] font-medium"
                                disabled={searching}
                                onClick={searchUsers}
                            >
                                {searching ? t("sxPermissionsSearching") : t("sxPermissionsSearch")}
                            </Button>
                        </div>
                        {userId && (
                            <p className="mt-2.5 text-sm text-muted-foreground">
                                {t("sxPermissionsSelectedLabel")}{" "}
                                <span className="font-medium text-foreground">{userLabel}</span>
                            </p>
                        )}
                    </li>
                </Group>
                {searching && (
                    <div className="mt-3">
                        <ListSkeleton rows={2} />
                    </div>
                )}
                {!searching && searchFailed && (
                    <div className="mt-3">
                        <Notice
                            title={t("sxPermissionsUserSearchError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={searchUsers}
                        />
                    </div>
                )}
                {!searching && searchedEmpty && (
                    <div className="mt-3">
                        <Notice
                            title={t("sxPermissionsNoUsersTitle")}
                            description={t("sxPermissionsNoUsersDescription")}
                        />
                    </div>
                )}
                {!searching && users.length > 0 && (
                    <Group className="mt-3">
                        {users.map(u => (
                            <Row
                                key={u.id}
                                title={u.username || u.email || u.id}
                                subtitle={u.email}
                                onClick={() => {
                                    setUserId(u.id);
                                    setUserLabel(u.username || u.email || u.id);
                                    setUsers([]);
                                    setUserQuery(u.username || u.email || "");
                                }}
                            />
                        ))}
                    </Group>
                )}
            </Section>

            <Section label={t("sxPermissionsResourceSection")}>
                {typesReady ? (
                    <Group>
                        <li className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                            <span className="text-base font-medium">{t("sxPermissionsResourceType")}</span>
                            <Select value={resourceType} onValueChange={setResourceType}>
                                <SelectTrigger
                                    aria-label={t("sxPermissionsResourceType")}
                                    className="max-w-full"
                                >
                                    <SelectValue placeholder={t("sxPermissionsSelectType")} />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {types.map((rt: any) => (
                                        <SelectItem key={rt.type} value={rt.type}>
                                            {rt.type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </li>
                        <li className="px-4 py-3.5">
                            <div className="text-base font-medium">{t("sxPermissionsResourceName")}</div>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">
                                {t("sxPermissionsResourceNameHint")}
                            </p>
                            <Input
                                size="lg"
                                className="mt-3"
                                aria-label={t("sxPermissionsResourceName")}
                                value={resourceName}
                                onChange={e => setResourceName(e.target.value)}
                                placeholder={t("sxPermissionsOptionalPlaceholder")}
                            />
                        </li>
                    </Group>
                ) : (
                    <ResourceTypesState state={resourceTypes} />
                )}
            </Section>

            {scopeOptions.length > 0 && (
                <Section label={t("sxPermissionsScopes")}>
                    <Group>
                        {scopeOptions.map((s: string) => (
                            <CheckRow
                                key={s}
                                label={s}
                                checked={scopes.includes(s)}
                                onToggle={() => toggleScope(s)}
                            />
                        ))}
                    </Group>
                </Section>
            )}

            <div className="flex justify-end">
                <Button size="form" disabled={running} onClick={evaluate}>
                    {running ? t("sxPermissionsEvaluating") : t("sxPermissionsEvaluate")}
                </Button>
            </div>

            <Section label={t("sxPermissionsResult")}>
                {running ? (
                    <ListSkeleton rows={2} />
                ) : evalFailed ? (
                    <Notice
                        title={t("sxPermissionsEvaluateError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={evaluate}
                    />
                ) : result === null ? (
                    <Notice
                        title={t("sxPermissionsResultEmptyTitle")}
                        description={t("sxPermissionsResultEmptyDescription")}
                    />
                ) : (
                    <EvaluationResult result={result} />
                )}
            </Section>
        </>
    );
}

function StatusIcon({ permit }: { permit: boolean }) {
    return permit ? (
        <CheckCircleIcon weight="fill" className="size-6 text-[#248a3d] dark:text-[#32d74b]" />
    ) : (
        <XCircleIcon weight="fill" className="size-6 text-[#d70015] dark:text-[#ff453a]" />
    );
}

function EvaluationResult({ result }: any) {
    const t = useT();
    const results = result?.results || [];
    const first = results[0] || {};
    const permit = result?.status === "PERMIT" || first?.status === "PERMIT";
    const allowed = (first?.allowedScopes || [])
        .slice()
        .sort((a: any, b: any) => (a?.name || "").localeCompare(b?.name || ""));
    const denied = (first?.deniedScopes || [])
        .slice()
        .sort((a: any, b: any) => (a?.name || "").localeCompare(b?.name || ""));
    const policies = first?.policies || [];

    return (
        <div className="flex flex-col gap-6">
            <Group>
                <Row
                    leading={<StatusIcon permit={permit} />}
                    title={permit ? t("sxPermissionsResultPermit") : t("sxPermissionsResultDeny")}
                    subtitle={first?.resource?.name || t("sxPermissionsAllResources")}
                    trailing={
                        <Chip tone={permit ? "success" : "danger"}>{permit ? "PERMIT" : "DENY"}</Chip>
                    }
                />
            </Group>

            {allowed.length > 0 && (
                <div>
                    <Caption>{t("sxPermissionsAllowedScopes")}</Caption>
                    <Group>
                        {allowed.map((s: any) => (
                            <Row
                                key={s.id || s.name}
                                className="min-h-13"
                                title={s.name}
                                trailing={<StatusIcon permit />}
                            />
                        ))}
                    </Group>
                </div>
            )}

            {denied.length > 0 && (
                <div>
                    <Caption>{t("sxPermissionsDeniedScopes")}</Caption>
                    <Group>
                        {denied.map((s: any) => (
                            <Row
                                key={s.id || s.name}
                                className="min-h-13"
                                title={s.name}
                                trailing={<StatusIcon permit={false} />}
                            />
                        ))}
                    </Group>
                </div>
            )}

            {policies.length > 0 && (
                <div>
                    <Caption>{t("sxPermissionsPolicyResults")}</Caption>
                    <Group>
                        {policies.map((p: any, i: number) => (
                            <Row
                                key={p?.policy?.id || i}
                                className="min-h-13"
                                title={p?.policy?.name || "—"}
                                trailing={
                                    <Chip tone={p?.status === "PERMIT" ? "success" : "danger"}>
                                        {p?.status}
                                    </Chip>
                                }
                            />
                        ))}
                    </Group>
                </div>
            )}
        </div>
    );
}

function useConfirm() {
    const t = useT();
    const [opts, setOpts] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const confirm = (o: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setOpts(o);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxPermissionsCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? t("sxPermissionsConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}
