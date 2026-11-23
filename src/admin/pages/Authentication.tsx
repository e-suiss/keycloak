// @ts-nocheck

import {
    ArrowDownIcon,
    ArrowUpIcon,
    CaretRightIcon,
    CopyIcon,
    DotsThreeIcon,
    GearSixIcon,
    GitBranchIcon,
    GitForkIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
import { ToggleGroup, ToggleGroupItem } from "@ui/components/toggle-group";
import { cn } from "@ui/lib/utils";
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
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import {
    AdminPage,
    Chip,
    GROUP,
    Group,
    ListSkeleton,
    Notice,
    SEPARATOR,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useRealm } from "../ui/realm";
import { adminFetch } from "../ui/util";
import { AddStepModal } from "./authentication/AddStepModal";
import { AddSubFlowModal } from "./authentication/AddSubFlowModal";
import { ConfigField } from "./authentication/ConfigField";
import { EditFlowModal } from "./authentication/EditFlowModal";
import { RequiredActionConfigModal } from "./authentication/RequiredActionConfigModal";

const SUB_TABS = [
    { value: "flows", label: "sxAuthTabFlows" },
    { value: "actions", label: "sxAuthTabRequiredActions" },
    { value: "policies", label: "sxAuthTabPolicies" }
];

const POLICY_TABS = [
    { value: "password", label: "sxAuthPolicyTabPassword" },
    { value: "otp", label: "OTP", raw: true },
    { value: "webauthn", label: "WebAuthn", raw: true },
    { value: "passwordless", label: "sxAuthPolicyTabPasswordless" },
    { value: "ciba", label: "CIBA", raw: true }
];

const REQUIREMENTS = ["REQUIRED", "ALTERNATIVE", "DISABLED", "CONDITIONAL"] as const;
const REQUIREMENT_LABELS: Record<string, string> = {
    REQUIRED: "sxAuthRequirementRequired",
    ALTERNATIVE: "sxAuthRequirementAlternative",
    DISABLED: "sxAuthRequirementDisabled",
    CONDITIONAL: "sxAuthRequirementConditional"
};

const BINDINGS: { key: string; label: string }[] = [
    { key: "browserFlow", label: "sxAuthBindingBrowser" },
    { key: "registrationFlow", label: "sxAuthBindingRegistration" },
    { key: "directGrantFlow", label: "sxAuthBindingDirectGrant" },
    { key: "resetCredentialsFlow", label: "sxAuthBindingResetCredentials" },
    { key: "clientAuthenticationFlow", label: "sxAuthBindingClientAuthentication" },
    { key: "dockerAuthenticationFlow", label: "sxAuthBindingDockerAuthentication" }
];

const OTP_TYPES = ["totp", "hotp"];
const OTP_ALGORITHMS = ["HmacSHA1", "HmacSHA256", "HmacSHA512"];
const OTP_DIGITS = ["6", "8"];

const WEBAUTHN_SIG_ALGS = [
    "ES256",
    "ES384",
    "ES512",
    "RS256",
    "RS384",
    "RS512",
    "Ed25519",
    "RS1"
];
const ATTESTATION_PREFERENCE = ["not specified", "none", "indirect", "direct"];
const AUTHENTICATOR_ATTACHMENT = ["not specified", "platform", "cross-platform"];
const RESIDENT_KEY_OPTIONS = ["not specified", "Yes", "No"];
const USER_VERIFY = ["not specified", "required", "preferred", "discouraged"];
const WEBAUTHN_OPTION_LABELS: Record<string, string> = {
    "not specified": "sxAuthNotSpecified",
    Yes: "sxAuthYes",
    No: "sxAuthNo"
};

const CIBA_DELIVERY_MODES = ["poll", "ping"];
const CIBA_USER_HINTS = ["login_hint", "id_token_hint", "login_hint_token"];

const HAIRLINE = "border-[#e5e5ea] dark:border-[#38383a]";

const EMPTY_STATUS = { flows: false, actions: false, rep: false };

function Choice({ value, onChange, options, placeholder, size = "default", className, id, "aria-label": ariaLabel }: any) {
    const t = useT();
    const normalized = options.map((o: any) =>
        typeof o === "string" ? { value: o, label: o } : o
    );
    const current = value ?? "";
    const known = normalized.some((o: any) => o.value === current);
    return (
        <NativeSelect
            id={id}
            size={size}
            className={className}
            aria-label={ariaLabel}
            value={current}
            onChange={(e: any) => onChange(e.target.value)}
        >
            {!known && current === "" && (
                <NativeSelectOption value="" disabled>
                    {placeholder ?? t("sxAuthSelect")}
                </NativeSelectOption>
            )}
            {!known && current !== "" && (
                <NativeSelectOption value={current}>{current}</NativeSelectOption>
            )}
            {normalized.map((o: any) => (
                <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                </NativeSelectOption>
            ))}
        </NativeSelect>
    );
}

export default function Authentication() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();

    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(EMPTY_STATUS);
    const loadedRef = useRef({ ...EMPTY_STATUS });
    const [tab, setTab] = useState("flows");

    const [flows, setFlows] = useState<any[]>([]);
    const [requiredActions, setRequiredActions] = useState<any[]>([]);
    const [rep, setRep] = useState<any>(null);
    const [passwordPolicyTypes, setPasswordPolicyTypes] = useState<any[]>([]);

    const [openFlow, setOpenFlow] = useState<string | null>(null);
    const openFlowRef = useRef<string | null>(null);
    openFlowRef.current = openFlow;
    const [executions, setExecutions] = useState<any[]>([]);
    const [execLoading, setExecLoading] = useState(false);
    const [execFailed, setExecFailed] = useState(false);

    const [dupTarget, setDupTarget] = useState<any>(null);
    const [dupName, setDupName] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        alias: "",
        description: "",
        providerId: "basic-flow"
    });

    const [saving, setSaving] = useState(false);

    const [stepTarget, setStepTarget] = useState<any>(null);
    const [subFlowTarget, setSubFlowTarget] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [raConfig, setRaConfig] = useState<any>(null);

    const loadRequiredActions = async () => {
        const am = adminClient.authenticationManagement;
        let registered = await adminFetch(
            adminClient,
            realm,
            "ui-ext/authentication-management/required-actions"
        ).catch(() => null);
        if (!Array.isArray(registered) || registered.length === 0)
            registered = await am.getRequiredActions();
        const unregistered = await am.getUnregisteredRequiredActions().catch(() => []);
        return [
            ...(Array.isArray(registered) ? registered : []),
            ...(Array.isArray(unregistered) ? unregistered : []).map((a: any) => ({
                ...a,
                unregistered: true
            }))
        ];
    };

    const load = async (alive = { current: true }) => {
        const loaded = loadedRef.current;
        if (!loaded.flows || !loaded.actions || !loaded.rep) setLoading(true);
        try {
            const [flowsRes, actionsRes, realmRep, info] = await Promise.all([
                adminClient.authenticationManagement.getFlows().catch(() => null),
                loadRequiredActions().catch(() => null),
                adminClient.realms.findOne({ realm }).catch(() => null),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            if (!alive.current) return;
            if (flowsRes !== null) {
                setFlows(Array.isArray(flowsRes) ? flowsRes : []);
                loaded.flows = true;
            }
            if (actionsRes !== null) {
                setRequiredActions(Array.isArray(actionsRes) ? actionsRes : []);
                loaded.actions = true;
            }
            if (realmRep) {
                setRep(realmRep);
                loaded.rep = true;
            }
            if (info?.passwordPolicies) setPasswordPolicyTypes(info.passwordPolicies);
            setFailed({
                flows: !loaded.flows,
                actions: !loaded.actions,
                rep: !loaded.rep
            });
        } finally {
            if (alive.current) setLoading(false);
        }
    };

    useEffect(() => {
        const alive = { current: true };
        loadedRef.current = { ...EMPTY_STATUS };
        setFailed(EMPTY_STATUS);
        setFlows([]);
        setRequiredActions([]);
        setRep(null);
        setOpenFlow(null);
        setExecutions([]);
        setExecFailed(false);
        setStepTarget(null);
        setSubFlowTarget(null);
        setEditTarget(null);
        setRaConfig(null);
        load(alive);
        return () => {
            alive.current = false;
        };
    }, [realm]);

    const setField = (k: string, v: any) => setRep((p: any) => ({ ...p, [k]: v }));

    const persist = async (patch: any, okMsg: string, errMsg: string) => {
        setSaving(true);
        try {
            const next = { ...rep, ...patch };
            await adminClient.realms.update({ realm }, next);
            setRep(next);
            addAlert(okMsg, AlertVariant.success);
        } catch (err) {
            addError(errMsg, err);
        } finally {
            setSaving(false);
        }
    };

    const topLevelFlows = useMemo(() => flows.filter(f => f?.topLevel), [flows]);
    const topLevelAliases = topLevelFlows.map(f => f.alias);

    const loadExecutions = async (flowAlias: string, silent = false) => {
        if (!silent) {
            setExecLoading(true);
            setExecFailed(false);
        }
        try {
            const res = await adminClient.authenticationManagement.getExecutions({
                flow: flowAlias
            });
            if (openFlowRef.current !== flowAlias) return;
            setExecutions(Array.isArray(res) ? res : []);
            setExecFailed(false);
        } catch (err) {
            if (openFlowRef.current !== flowAlias) return;
            if (silent) addError(t("sxAuthStepsReloadError"), err);
            else {
                setExecutions([]);
                setExecFailed(true);
            }
        } finally {
            if (!silent && openFlowRef.current === flowAlias) setExecLoading(false);
        }
    };

    const toggleFlow = async (flow: any) => {
        if (openFlow === flow.alias) {
            openFlowRef.current = null;
            setOpenFlow(null);
            setExecutions([]);
            setExecFailed(false);
            return;
        }
        openFlowRef.current = flow.alias;
        setOpenFlow(flow.alias);
        setExecutions([]);
        await loadExecutions(flow.alias);
    };

    const changeRequirement = async (
        flowAlias: string,
        exec: any,
        requirement: string
    ) => {
        try {
            await adminClient.authenticationManagement.updateExecution(
                { flow: flowAlias },
                { ...exec, requirement }
            );
            addAlert(t("sxAuthRequirementUpdated"), AlertVariant.success);
            await loadExecutions(flowAlias, true);
        } catch (err) {
            addError(t("sxAuthStepUpdateError"), err);
        }
    };

    const moveExec = async (flowAlias: string, exec: any, dir: "up" | "down") => {
        try {
            if (dir === "up")
                await adminClient.authenticationManagement.raisePriorityExecution({
                    id: exec.id
                });
            else
                await adminClient.authenticationManagement.lowerPriorityExecution({
                    id: exec.id
                });
            await loadExecutions(flowAlias, true);
        } catch (err) {
            addError(t("sxAuthReorderError"), err);
        }
    };
    const [cfgExec, setCfgExec] = useState<any>(null);
    const [cfgDesc, setCfgDesc] = useState<any>(null);
    const [cfgValues, setCfgValues] = useState<Record<string, any>>({});
    const [cfgAlias, setCfgAlias] = useState("");
    const [cfgLoading, setCfgLoading] = useState(false);
    const [cfgFailed, setCfgFailed] = useState(false);
    const [cfgSaving, setCfgSaving] = useState(false);
    const cfgExecRef = useRef<any>(null);

    const openConfig = async (exec: any) => {
        cfgExecRef.current = exec;
        setCfgExec(exec);
        setCfgDesc(null);
        setCfgValues({});
        setCfgAlias("");
        setCfgFailed(false);
        setCfgLoading(true);
        try {
            const desc = await adminClient.authenticationManagement.getConfigDescription({
                providerId: exec.providerId
            });
            let values: Record<string, any> = {};
            let alias = `${exec.providerId}-config`;
            if (exec.authenticationConfig) {
                const cfg = await adminClient.authenticationManagement.getConfig({
                    id: exec.authenticationConfig
                });
                alias = cfg?.alias || alias;
                values = { ...(cfg?.config || {}) };
            } else {
                (desc?.properties || []).forEach((p: any) => {
                    if (p.defaultValue !== undefined && p.defaultValue !== null)
                        values[p.name] = String(p.defaultValue);
                });
            }
            if (cfgExecRef.current !== exec) return;
            setCfgDesc(desc || { properties: [] });
            setCfgValues(values);
            setCfgAlias(alias);
        } catch {
            if (cfgExecRef.current === exec) setCfgFailed(true);
        } finally {
            if (cfgExecRef.current === exec) setCfgLoading(false);
        }
    };

    const closeConfig = () => {
        cfgExecRef.current = null;
        setCfgExec(null);
    };

    const saveConfig = async () => {
        if (!cfgExec) return;
        setCfgSaving(true);
        try {
            const config: Record<string, string> = {};
            Object.entries(cfgValues).forEach(([k, v]) => {
                config[k] = typeof v === "boolean" ? String(v) : (v ?? "");
            });
            const alias = cfgAlias.trim() || `${cfgExec.providerId}-config`;
            if (cfgExec.authenticationConfig) {
                await adminClient.authenticationManagement.updateConfig({
                    id: cfgExec.authenticationConfig,
                    alias,
                    config
                });
            } else {
                await adminClient.authenticationManagement.createConfig({
                    id: cfgExec.id,
                    alias,
                    config
                });
            }
            addAlert(t("sxAuthStepConfigSaved"), AlertVariant.success);
            const flowAlias = openFlow;
            closeConfig();
            if (flowAlias) await loadExecutions(flowAlias, true);
        } catch (err) {
            addError(t("sxAuthStepConfigSaveError"), err);
        } finally {
            setCfgSaving(false);
        }
    };

    const flowUpdated = () => addAlert(t("sxAuthXFlowUpdated"), AlertVariant.success);

    const addExecution = async (parentAlias: string, provider: any) => {
        try {
            await adminClient.authenticationManagement.addExecutionToFlow({
                flow: parentAlias,
                provider: provider.id
            });
            flowUpdated();
            if (openFlowRef.current) await loadExecutions(openFlowRef.current, true);
            return true;
        } catch (err) {
            addError(t("sxAuthXFlowUpdateError"), err);
            return false;
        }
    };

    const addSubFlow = async (parentAlias: string, value: any) => {
        try {
            await adminClient.authenticationManagement.addFlowToFlow({
                flow: parentAlias,
                alias: value.name,
                description: value.description,
                provider: value.provider,
                type: value.type
            });
            flowUpdated();
            if (openFlowRef.current) await loadExecutions(openFlowRef.current, true);
            return true;
        } catch (err) {
            addError(t("sxAuthXFlowUpdateError"), err);
            return false;
        }
    };

    const deleteExecution = (flowAlias: string, exec: any) =>
        confirm({
            title: exec.authenticationFlow
                ? t("sxAuthXDeleteSubFlowTitle")
                : t("sxAuthXDeleteStepTitle"),
            message: t("sxAuthXDeleteStepMessage", {
                name: exec.displayName || exec.providerId || ""
            }),
            confirmLabel: t("sxAuthDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.authenticationManagement.delExecution({ id: exec.id });
                    addAlert(t("sxAuthXStepDeleted"), AlertVariant.success);
                    await loadExecutions(flowAlias, true);
                } catch (err) {
                    addError(t("sxAuthXStepDeleteError"), err);
                }
            }
        });

    const saveEdit = async ({ name, description }: { name: string; description: string }) => {
        const target = editTarget;
        if (!target) return false;
        try {
            if (target.kind === "exec") {
                await adminClient.authenticationManagement.updateExecution(
                    { flow: target.flowAlias },
                    { ...target.exec, displayName: name, description }
                );
                flowUpdated();
                if (openFlowRef.current) await loadExecutions(openFlowRef.current, true);
            } else {
                const flow = target.flow;
                await adminClient.authenticationManagement.updateFlow(
                    { flowId: flow.id },
                    { ...flow, alias: name, description }
                );
                flowUpdated();
                if (openFlowRef.current === flow.alias && name !== flow.alias) {
                    openFlowRef.current = name;
                    setOpenFlow(name);
                    await loadExecutions(name, true);
                }
                await load();
            }
            return true;
        } catch (err) {
            addError(t("sxAuthXFlowUpdateError"), err);
            return false;
        }
    };

    const submitDuplicate = async () => {
        if (!dupTarget || !dupName.trim()) return;
        try {
            await adminClient.authenticationManagement.copyFlow({
                flow: dupTarget.alias,
                newName: dupName.trim()
            });
            addAlert(t("sxAuthFlowCopied"), AlertVariant.success);
            setDupTarget(null);
            setDupName("");
            await load();
        } catch (err) {
            addError(t("sxAuthFlowCopyError"), err);
        }
    };

    const deleteFlow = (flow: any) =>
        confirm({
            title: t("sxAuthDeleteFlowTitle"),
            message: t("sxAuthDeleteFlowMessage", { name: flow.alias }),
            confirmLabel: t("sxAuthDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.authenticationManagement.deleteFlow({
                        flowId: flow.id
                    });
                    addAlert(t("sxAuthFlowDeleted"), AlertVariant.success);
                    if (openFlow === flow.alias) {
                        openFlowRef.current = null;
                        setOpenFlow(null);
                        setExecutions([]);
                        setExecFailed(false);
                    }
                    await load();
                } catch (err) {
                    addError(t("sxAuthFlowDeleteError"), err);
                }
            }
        });

    const submitCreate = async () => {
        if (!createForm.alias.trim()) return;
        try {
            await adminClient.authenticationManagement.createFlow({
                alias: createForm.alias.trim(),
                description: createForm.description,
                providerId: createForm.providerId,
                topLevel: true,
                builtIn: false
            });
            addAlert(t("sxAuthFlowCreated"), AlertVariant.success);
            setCreateOpen(false);
            setCreateForm({ alias: "", description: "", providerId: "basic-flow" });
            await load();
        } catch (err) {
            addError(t("sxAuthFlowCreateError"), err);
        }
    };

    const sortedActions = useMemo(
        () => [
            ...requiredActions
                .filter(a => !a?.unregistered)
                .sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0)),
            ...requiredActions
                .filter(a => a?.unregistered)
                .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
        ],
        [requiredActions]
    );

    const updateAction = async (action: any, patch: any) => {
        try {
            const { configurable, unregistered, ...rest } = action;
            await adminClient.authenticationManagement.updateRequiredAction(
                { alias: action.alias },
                { ...rest, ...patch }
            );
            addAlert(t("sxAuthRequiredActionUpdated"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxAuthRequiredActionUpdateError"), err);
        }
    };

    const registerAction = async (action: any) => {
        try {
            await adminClient.authenticationManagement.registerRequiredAction({
                name: action.name,
                providerId: action.providerId
            });
            addAlert(t("sxAuthXRequiredActionRegistered"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxAuthXRequiredActionRegisterError"), err);
        }
    };

    const confirmClearConfig = (run: () => Promise<void>) =>
        confirm({
            title: t("sxAuthXClearConfigTitle"),
            message: t("sxAuthXClearConfigMessage"),
            confirmLabel: t("sxAuthXClearConfig"),
            danger: true,
            onConfirm: run
        });

    const moveAction = async (action: any, dir: "up" | "down") => {
        try {
            if (dir === "up")
                await adminClient.authenticationManagement.raiseRequiredActionPriority({
                    alias: action.alias
                });
            else
                await adminClient.authenticationManagement.lowerRequiredActionPriority({
                    alias: action.alias
                });
            await load();
        } catch (err) {
            addError(t("sxAuthPriorityError"), err);
        }
    };

    const policyTokens = useMemo(
        () => parsePolicy(rep?.passwordPolicy || "", passwordPolicyTypes),
        [rep?.passwordPolicy, passwordPolicyTypes]
    );
    const usedPolicyIds = new Set(policyTokens.map(x => x.id));
    const availablePolicyTypes = passwordPolicyTypes.filter(
        p => !usedPolicyIds.has(p.id) || p.multipleSupported
    );

    const addPolicy = (type: any) => {
        const next = [
            ...policyTokens,
            {
                id: type.id,
                displayName: type.displayName,
                configType: type.configType,
                value: type.defaultValue ?? ""
            }
        ];
        setField("passwordPolicy", serializePolicy(next));
    };
    const setPolicyValue = (idx: number, value: string) => {
        const next = policyTokens.map((x, i) => (i === idx ? { ...x, value } : x));
        setField("passwordPolicy", serializePolicy(next));
    };
    const removePolicy = (idx: number) => {
        const next = policyTokens.filter((_, i) => i !== idx);
        setField("passwordPolicy", serializePolicy(next));
    };

    const tabFailed =
        tab === "flows" ? failed.flows || failed.rep : tab === "actions" ? failed.actions : failed.rep;
    const tabErrorTitle =
        tab === "flows"
            ? t("sxAuthFlowsLoadError")
            : tab === "actions"
              ? t("sxAuthRequiredActionsLoadError")
              : t("sxAuthPoliciesLoadError");

    const pageActions =
        tab === "flows" && !loading && !tabFailed ? (
            <Button onClick={() => setCreateOpen(true)}>{t("sxAuthCreateFlow")}</Button>
        ) : undefined;

    return (
        <AdminPage
            width="wide"
            title={t("sxAuthTitle")}
            description={t("sxAuthDescription")}
            actions={pageActions}
        >
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={SUB_TABS.map(x => ({ value: x.value, label: t(x.label) }))}
                ariaLabel={t("sxAuthSectionsLabel")}
            />

            {loading ? (
                <ListSkeleton rows={4} />
            ) : tabFailed ? (
                <Notice
                    title={tabErrorTitle}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => load()}
                />
            ) : (
                <>
                    {tab === "flows" && (
                        <FlowsTab
                            flows={flows}
                            topLevelFlows={topLevelFlows}
                            topLevelAliases={topLevelAliases}
                            openFlow={openFlow}
                            executions={executions}
                            execLoading={execLoading}
                            execFailed={execFailed}
                            onRetryExecutions={(alias: string) => loadExecutions(alias)}
                            toggleFlow={toggleFlow}
                            changeRequirement={changeRequirement}
                            moveExec={moveExec}
                            onConfigure={openConfig}
                            onAddStep={(target: any) => setStepTarget(target)}
                            onAddSubFlow={(alias: string) => setSubFlowTarget(alias)}
                            onDeleteExecution={deleteExecution}
                            onEditExecution={(flowAlias: string, exec: any) =>
                                setEditTarget({ kind: "exec", flowAlias, exec })
                            }
                            onEditFlow={(flow: any) => setEditTarget({ kind: "flow", flow })}
                            onDuplicate={(f: any) => {
                                setDupTarget(f);
                                setDupName(t("sxAuthCopyDefaultName", { name: f.alias }));
                            }}
                            onDelete={deleteFlow}
                            onCreate={() => setCreateOpen(true)}
                            bindings={rep}
                            onBind={(k: string, v: string) =>
                                persist(
                                    { [k]: v || undefined },
                                    t("sxAuthBindingSaved"),
                                    t("sxAuthBindingSaveError")
                                )
                            }
                            saving={saving}
                        />
                    )}

                    {tab === "actions" && (
                        <RequiredActionsTab
                            actions={sortedActions}
                            onUpdate={updateAction}
                            onMove={moveAction}
                            onRegister={registerAction}
                            onConfigure={(a: any) => setRaConfig(a)}
                        />
                    )}

                    {tab === "policies" && (
                        <PoliciesTab
                            rep={rep}
                            setField={setField}
                            persist={persist}
                            saving={saving}
                            policyTokens={policyTokens}
                            availablePolicyTypes={availablePolicyTypes}
                            addPolicy={addPolicy}
                            setPolicyValue={setPolicyValue}
                            removePolicy={removePolicy}
                        />
                    )}
                </>
            )}

            <Modal open={!!dupTarget} onOpenChange={o => !o && setDupTarget(null)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{t("sxAuthCopyFlowTitle")}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <p className="text-[15px] text-muted-foreground">
                                {t("sxAuthCopyFlowDescription", { name: dupTarget?.alias ?? "" })}
                            </p>
                            <Field size="lg">
                                <FieldLabel htmlFor="auth-dup-name">{t("sxAuthNewFlowName")}</FieldLabel>
                                <Input
                                    id="auth-dup-name"
                                    size="lg"
                                    value={dupName}
                                    onChange={(e: any) => setDupName(e.target.value)}
                                    placeholder={t("sxAuthFlowNamePlaceholder")}
                                />
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={submitDuplicate} disabled={!dupName.trim()}>
                            {t("sxAuthCopy")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{t("sxAuthCreateFlow")}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <Field size="lg">
                                <FieldLabel htmlFor="auth-create-alias">{t("sxAuthName")}</FieldLabel>
                                <Input
                                    id="auth-create-alias"
                                    size="lg"
                                    value={createForm.alias}
                                    onChange={(e: any) =>
                                        setCreateForm(p => ({ ...p, alias: e.target.value }))
                                    }
                                    placeholder={t("sxAuthCreateFlowNamePlaceholder")}
                                />
                            </Field>
                            <Field size="lg">
                                <FieldLabel htmlFor="auth-create-description">
                                    {t("sxAuthDescriptionLabel")}
                                </FieldLabel>
                                <Input
                                    id="auth-create-description"
                                    size="lg"
                                    value={createForm.description}
                                    onChange={(e: any) =>
                                        setCreateForm(p => ({
                                            ...p,
                                            description: e.target.value
                                        }))
                                    }
                                    placeholder={t("sxAuthOptional")}
                                />
                            </Field>
                            <Field size="lg">
                                <FieldLabel htmlFor="auth-create-type">{t("sxAuthFlowType")}</FieldLabel>
                                <Choice
                                    id="auth-create-type"
                                    size="lg"
                                    className="w-full"
                                    value={createForm.providerId}
                                    onChange={(v: string) =>
                                        setCreateForm(p => ({ ...p, providerId: v }))
                                    }
                                    options={[
                                        { value: "basic-flow", label: t("sxAuthBasicFlow") },
                                        { value: "client-flow", label: t("sxAuthClientFlow") }
                                    ]}
                                />
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={submitCreate} disabled={!createForm.alias.trim()}>
                            {t("sxAuthCreate")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal open={!!cfgExec} onOpenChange={o => !o && closeConfig()}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>
                            {t("sxAuthConfigTitle", {
                                name: cfgExec?.displayName || cfgExec?.providerId || ""
                            })}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {cfgLoading ? (
                            <ListSkeleton rows={2} />
                        ) : cfgFailed ? (
                            <Notice
                                title={t("sxAuthStepConfigLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => cfgExec && openConfig(cfgExec)}
                            />
                        ) : (cfgDesc?.properties || []).length === 0 ? (
                            <Notice
                                title={t("sxAuthNoConfigTitle")}
                                description={t("sxAuthNoConfigDescription")}
                            />
                        ) : (
                            <FieldGroup>
                                {cfgDesc.properties.map((p: any) => (
                                    <ConfigField
                                        key={p.name}
                                        prop={p}
                                        value={cfgValues[p.name]}
                                        onChange={(v: any) =>
                                            setCfgValues(s => ({ ...s, [p.name]: v }))
                                        }
                                    />
                                ))}
                            </FieldGroup>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            onClick={saveConfig}
                            disabled={cfgSaving || cfgLoading || cfgFailed}
                        >
                            {t("sxAuthSave")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {stepTarget && (
                <AddStepModal
                    flowName={stepTarget.flowName}
                    mode={stepTarget.mode}
                    flowProviderId={stepTarget.flowProviderId}
                    flowId={stepTarget.flowId}
                    onClose={() => setStepTarget(null)}
                    onAdd={(provider: any) => addExecution(stepTarget.flowName, provider)}
                />
            )}

            {subFlowTarget && (
                <AddSubFlowModal
                    flowName={subFlowTarget}
                    onClose={() => setSubFlowTarget(null)}
                    onAdd={(value: any) => addSubFlow(subFlowTarget, value)}
                />
            )}

            {editTarget && (
                <EditFlowModal
                    title={
                        editTarget.kind === "exec"
                            ? t("sxAuthXEditSubFlowTitle")
                            : t("sxAuthXEditFlowTitle")
                    }
                    initialName={
                        editTarget.kind === "exec"
                            ? editTarget.exec.displayName
                            : editTarget.flow.alias
                    }
                    initialDescription={
                        editTarget.kind === "exec"
                            ? editTarget.exec.description
                            : editTarget.flow.description
                    }
                    onClose={() => setEditTarget(null)}
                    onSave={saveEdit}
                />
            )}

            {raConfig && (
                <RequiredActionConfigModal
                    action={raConfig}
                    onClose={() => setRaConfig(null)}
                    onConfirmClear={confirmClearConfig}
                />
            )}

            {confirmNode}
        </AdminPage>
    );
}

function SaveBar({ onClick, saving }: any) {
    const t = useT();
    return (
        <div className="flex justify-end">
            <Button size="form" onClick={onClick} disabled={saving}>
                {saving ? t("sxAuthSaving") : t("sxAuthSave")}
            </Button>
        </div>
    );
}

function FormCard({ children }: { children: ReactNode }) {
    return <div className={cn(GROUP, "grid gap-4 p-4 sm:grid-cols-2")}>{children}</div>;
}

function FormField({ label, hint, wide, children }: any) {
    const id = useId();
    return (
        <Field size="lg" className={cn("min-w-0", wide && "sm:col-span-2")}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {children(id)}
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
        </Field>
    );
}

function SelectField({ label, hint, value, onChange, options }: any) {
    return (
        <FormField label={label} hint={hint}>
            {(id: string) => (
                <Choice
                    id={id}
                    size="lg"
                    className="w-full"
                    value={value}
                    onChange={onChange}
                    options={options}
                />
            )}
        </FormField>
    );
}

function NumberField({ label, hint, value, onChange }: any) {
    return (
        <FormField label={label} hint={hint}>
            {(id: string) => (
                <Input
                    id={id}
                    size="lg"
                    type="number"
                    className="tabular-nums"
                    value={value}
                    onChange={(e: any) => onChange(Number(e.target.value))}
                />
            )}
        </FormField>
    );
}

function IconAction({ label, onClick, disabled, children }: any) {
    return (
        <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            onClick={onClick}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground"
        >
            {children}
        </Button>
    );
}

function requirementOptions(ex: any, t: any) {
    return (ex.requirementChoices?.length ? ex.requirementChoices : REQUIREMENTS).map(
        (r: string) => ({
            value: r,
            label: REQUIREMENT_LABELS[r] ? t(REQUIREMENT_LABELS[r]) : r
        })
    );
}

function FlowsTab({
    topLevelFlows,
    topLevelAliases,
    openFlow,
    executions,
    execLoading,
    execFailed,
    onRetryExecutions,
    toggleFlow,
    changeRequirement,
    moveExec,
    onConfigure,
    onAddStep,
    onAddSubFlow,
    onDeleteExecution,
    onEditExecution,
    onEditFlow,
    onDuplicate,
    onDelete,
    onCreate,
    bindings,
    onBind
}: any) {
    const t = useT();
    if (!topLevelFlows.length) {
        return (
            <Notice
                title={t("sxAuthNoFlowsTitle")}
                description={t("sxAuthNoFlowsDescription")}
                action={<Button onClick={onCreate}>{t("sxAuthCreateFlow")}</Button>}
            />
        );
    }

    return (
        <>
            <Section label={t("sxAuthFlowBindings")}>
                <Group>
                    {BINDINGS.map(({ key, label }) => (
                        <li
                            key={key}
                            className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5"
                        >
                            <span className="min-w-0 text-base">{t(label)}</span>
                            <Choice
                                className="w-40 shrink-0 sm:w-64"
                                value={bindings?.[key] ?? ""}
                                onChange={(v: string) => onBind(key, v)}
                                options={[
                                    { value: "", label: "—" },
                                    ...topLevelAliases.map((a: string) => ({ value: a, label: a }))
                                ]}
                                aria-label={t(label)}
                            />
                        </li>
                    ))}
                </Group>
            </Section>

            <Section label={t("sxAuthTabFlows")}>
                <Group>
                    {topLevelFlows.map((flow: any) => {
                        const isOpen = openFlow === flow.alias;
                        const usedBy = BINDINGS.filter(b => bindings?.[b.key] === flow.alias);
                        const editable = !flow.builtIn;
                        return (
                            <li key={flow.id || flow.alias}>
                                <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleFlow(flow)}
                                        aria-expanded={isOpen}
                                        className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                    >
                                        <CaretRightIcon
                                            className={cn(
                                                "mt-1.5 size-3.5 shrink-0 text-muted-foreground transition-transform rtl:rotate-180",
                                                isOpen && "rotate-90 rtl:rotate-90"
                                            )}
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-base font-medium [overflow-wrap:anywhere]">
                                                {flow.alias}
                                            </span>
                                            {flow.description && (
                                                <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                    {flow.description}
                                                </span>
                                            )}
                                            <span className="mt-2 flex flex-wrap gap-1.5">
                                                {usedBy.map(b => (
                                                    <Chip key={b.key} tone="success">
                                                        {t(b.label)}
                                                    </Chip>
                                                ))}
                                                <Chip tone={flow.builtIn ? "neutral" : "info"}>
                                                    {flow.builtIn ? t("sxAuthBuiltIn") : t("sxAuthCustom")}
                                                </Chip>
                                            </span>
                                        </span>
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={t("sxAuthXFlowActions", { name: flow.alias })}
                                                className="shrink-0 text-muted-foreground hover:text-foreground"
                                            >
                                                <DotsThreeIcon weight="bold" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {editable && (
                                                <DropdownMenuItem onClick={() => onEditFlow(flow)}>
                                                    <PencilSimpleIcon /> {t("sxAuthXEditDetails")}
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => onDuplicate(flow)}>
                                                <CopyIcon /> {t("sxAuthCopy")}
                                            </DropdownMenuItem>
                                            {editable && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onClick={() => onDelete(flow)}
                                                    >
                                                        <TrashIcon /> {t("sxAuthDelete")}
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {isOpen && (
                                    <div className={cn("border-t bg-white/70 dark:bg-black/20", HAIRLINE)}>
                                        {execLoading ? (
                                            <div className="p-3">
                                                <ListSkeleton rows={2} />
                                            </div>
                                        ) : execFailed ? (
                                            <div className="p-3">
                                                <Notice
                                                    title={t("sxAuthStepsLoadError")}
                                                    description={t("sxLoadErrorDescription")}
                                                    onRetry={() => onRetryExecutions(flow.alias)}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                {editable ? (
                                                    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
                                                        <Button
                                                            variant="plain"
                                                            size="sm"
                                                            onClick={() =>
                                                                onAddStep({
                                                                    flowName: flow.alias,
                                                                    mode: "step",
                                                                    flowProviderId: flow.providerId
                                                                })
                                                            }
                                                        >
                                                            <PlusIcon /> {t("sxAuthXAddStep")}
                                                        </Button>
                                                        <Button
                                                            variant="plain"
                                                            size="sm"
                                                            onClick={() => onAddSubFlow(flow.alias)}
                                                        >
                                                            <GitForkIcon /> {t("sxAuthXAddSubFlow")}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                                                        <p className="min-w-0 text-[13px] text-muted-foreground">
                                                            {t("sxAuthXBuiltInReadOnly")}
                                                        </p>
                                                        <TextAction
                                                            className="text-[13px]"
                                                            onClick={() => onDuplicate(flow)}
                                                        >
                                                            {t("sxAuthCopy")}
                                                        </TextAction>
                                                    </div>
                                                )}
                                                <div aria-hidden className={cn("border-t", HAIRLINE)} />
                                                {executions.length === 0 ? (
                                                    <div className="p-3">
                                                        <Notice
                                                            title={t("sxAuthNoStepsTitle")}
                                                            description={
                                                                editable
                                                                    ? t("sxAuthXNoStepsEditableDescription")
                                                                    : t("sxAuthNoStepsDescription")
                                                            }
                                                        />
                                                    </div>
                                                ) : (
                                                    <ul aria-label={t("sxAuthFlowSteps", { name: flow.alias })}>
                                                        {executions.map((ex: any, i: number) => (
                                                            <ExecutionRow
                                                                key={ex.id || i}
                                                                ex={ex}
                                                                first={i === 0}
                                                                flow={flow}
                                                                editable={editable}
                                                                changeRequirement={changeRequirement}
                                                                moveExec={moveExec}
                                                                onConfigure={onConfigure}
                                                                onAddStep={onAddStep}
                                                                onAddSubFlow={onAddSubFlow}
                                                                onDeleteExecution={onDeleteExecution}
                                                                onEditExecution={onEditExecution}
                                                            />
                                                        ))}
                                                    </ul>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </Group>
            </Section>
        </>
    );
}

function ExecutionRow({
    ex,
    first,
    flow,
    editable,
    changeRequirement,
    moveExec,
    onConfigure,
    onAddStep,
    onAddSubFlow,
    onDeleteExecution,
    onEditExecution
}: any) {
    const t = useT();
    const name = ex.displayName || ex.providerId;
    const options = requirementOptions(ex, t);
    const subtitle = ex.authenticationFlow ? ex.description : ex.alias;
    return (
        <li>
            {!first && <div aria-hidden className={SEPARATOR} />}
            <div
                className="flex flex-col gap-2 py-2.5 pe-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                style={{ paddingInlineStart: 16 + (ex.level || 0) * 20 }}
            >
                <div className="flex min-w-0 items-center gap-2">
                    {ex.level > 0 && (
                        <GitBranchIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="min-w-0 text-[15px] [overflow-wrap:anywhere]">{name}</span>
                            {ex.authenticationFlow && <Chip>{t("sxAuthSubFlow")}</Chip>}
                        </span>
                        {subtitle && (
                            <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                {subtitle}
                            </span>
                        )}
                    </span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                    {ex.configurable && (
                        <IconAction label={t("sxAuthConfigure")} onClick={() => onConfigure(ex)}>
                            <GearSixIcon />
                        </IconAction>
                    )}
                    <IconAction label={t("sxAuthMoveUp")} onClick={() => moveExec(flow.alias, ex, "up")}>
                        <ArrowUpIcon />
                    </IconAction>
                    <IconAction
                        label={t("sxAuthMoveDown")}
                        onClick={() => moveExec(flow.alias, ex, "down")}
                    >
                        <ArrowDownIcon />
                    </IconAction>
                    {editable && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t("sxAuthXStepActions", { name })}
                                    title={t("sxAuthXStepActions", { name })}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <DotsThreeIcon weight="bold" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {ex.authenticationFlow && (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                onAddStep({
                                                    flowName: ex.displayName,
                                                    mode: "step",
                                                    flowId: ex.flowId
                                                })
                                            }
                                        >
                                            <PlusIcon /> {t("sxAuthXAddStep")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                onAddStep({
                                                    flowName: ex.displayName,
                                                    mode: "condition"
                                                })
                                            }
                                        >
                                            <PlusIcon /> {t("sxAuthXAddCondition")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onAddSubFlow(ex.displayName)}>
                                            <GitForkIcon /> {t("sxAuthXAddSubFlow")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEditExecution(flow.alias, ex)}>
                                            <PencilSimpleIcon /> {t("sxAuthXEditDetails")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => onDeleteExecution(flow.alias, ex)}
                                >
                                    <TrashIcon /> {t("sxAuthDelete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {options.length > 1 ? (
                        <Choice
                            size="sm"
                            className="ms-1.5 w-32 sm:w-36"
                            value={ex.requirement}
                            onChange={(v: string) => changeRequirement(flow.alias, ex, v)}
                            options={options}
                            aria-label={t("sxAuthRequirement")}
                        />
                    ) : (
                        <span className="ms-1.5 flex w-32 justify-end sm:w-36">
                            <Chip>
                                {REQUIREMENT_LABELS[ex.requirement]
                                    ? t(REQUIREMENT_LABELS[ex.requirement])
                                    : ex.requirement}
                            </Chip>
                        </span>
                    )}
                </div>
            </div>
        </li>
    );
}

function RequiredActionsTab({ actions, onUpdate, onMove, onRegister, onConfigure }: any) {
    const t = useT();
    const [busy, setBusy] = useState<string | null>(null);
    if (!actions.length) {
        return (
            <Notice
                title={t("sxAuthNoRequiredActionsTitle")}
                description={t("sxAuthNoRequiredActionsDescription")}
            />
        );
    }
    const registeredCount = actions.filter((a: any) => !a.unregistered).length;
    const register = async (a: any) => {
        setBusy(a.providerId);
        try {
            await onRegister(a);
        } finally {
            setBusy(null);
        }
    };
    return (
        <Section label={t("sxAuthTabRequiredActions")}>
            <Group>
                {actions.map((a: any, i: number) => (
                    <li
                        key={a.unregistered ? `unregistered-${a.providerId}` : a.alias}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex shrink-0 flex-col">
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t("sxAuthMoveUp")}
                                    onClick={() => onMove(a, "up")}
                                    disabled={a.unregistered || i === 0}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowUpIcon />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t("sxAuthMoveDown")}
                                    onClick={() => onMove(a, "down")}
                                    disabled={a.unregistered || i >= registeredCount - 1}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowDownIcon />
                                </Button>
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-medium [overflow-wrap:anywhere]">
                                        {a.name || a.alias || a.providerId}
                                    </span>
                                    {a.unregistered && <Chip tone="warning">{t("sxAuthXNotRegistered")}</Chip>}
                                </div>
                                {(a.alias || a.providerId) && (a.alias || a.providerId) !== a.name && (
                                    <div className="mt-0.5 font-mono text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                        {a.alias || a.providerId}
                                    </div>
                                )}
                            </div>
                        </div>
                        {a.unregistered ? (
                            <div className="flex shrink-0 items-center gap-5 ps-9 sm:ps-0">
                                <TextAction disabled={busy === a.providerId} onClick={() => register(a)}>
                                    {t("sxAuthXRegister")}
                                </TextAction>
                            </div>
                        ) : (
                            <div className="flex shrink-0 items-center gap-5 ps-9 sm:ps-0">
                                <label
                                    htmlFor={`ra-enabled-${a.alias}`}
                                    className="flex items-center gap-2 text-[13px] text-muted-foreground"
                                >
                                    {t("sxAuthEnabled")}
                                    <Switch
                                        id={`ra-enabled-${a.alias}`}
                                        size="sm"
                                        checked={!!a.enabled}
                                        onCheckedChange={(v: boolean) => onUpdate(a, { enabled: v })}
                                    />
                                </label>
                                <label
                                    htmlFor={`ra-defaultAction-${a.alias}`}
                                    className="flex items-center gap-2 text-[13px] text-muted-foreground"
                                >
                                    {t("sxAuthDefaultAction")}
                                    <Switch
                                        id={`ra-defaultAction-${a.alias}`}
                                        size="sm"
                                        checked={!!a.defaultAction}
                                        onCheckedChange={(v: boolean) => onUpdate(a, { defaultAction: v })}
                                        disabled={!a.enabled}
                                    />
                                </label>
                                {a.configurable ? (
                                    <IconAction label={t("sxAuthConfigure")} onClick={() => onConfigure(a)}>
                                        <GearSixIcon />
                                    </IconAction>
                                ) : null}
                            </div>
                        )}
                    </li>
                ))}
            </Group>
        </Section>
    );
}

function PoliciesTab({
    rep,
    setField,
    persist,
    saving,
    policyTokens,
    availablePolicyTypes,
    addPolicy,
    setPolicyValue,
    removePolicy
}: any) {
    const t = useT();
    const [sub, setSub] = useState("password");

    const savePassword = () =>
        persist(
            { passwordPolicy: rep.passwordPolicy ?? "" },
            t("sxAuthPasswordPolicySaved"),
            t("sxAuthPasswordPolicySaveError")
        );

    const saveOtp = () =>
        persist(
            {
                otpPolicyType: rep.otpPolicyType,
                otpPolicyAlgorithm: rep.otpPolicyAlgorithm,
                otpPolicyDigits: rep.otpPolicyDigits,
                otpPolicyPeriod: rep.otpPolicyPeriod,
                otpPolicyLookAheadWindow: rep.otpPolicyLookAheadWindow
            },
            t("sxAuthOtpPolicySaved"),
            t("sxAuthOtpPolicySaveError")
        );

    const saveWebauthn = (prefix: string) =>
        persist(
            {
                [`${prefix}RpEntityName`]: rep[`${prefix}RpEntityName`],
                [`${prefix}SignatureAlgorithms`]: rep[`${prefix}SignatureAlgorithms`],
                [`${prefix}AttestationConveyancePreference`]:
                    rep[`${prefix}AttestationConveyancePreference`],
                [`${prefix}AuthenticatorAttachment`]: rep[`${prefix}AuthenticatorAttachment`],
                [`${prefix}RequireResidentKey`]: rep[`${prefix}RequireResidentKey`],
                [`${prefix}UserVerificationRequirement`]:
                    rep[`${prefix}UserVerificationRequirement`]
            },
            t("sxAuthWebauthnPolicySaved"),
            t("sxAuthWebauthnPolicySaveError")
        );

    const saveCiba = () =>
        persist(
            {
                cibaBackchannelTokenDeliveryMode: rep.cibaBackchannelTokenDeliveryMode,
                cibaExpiresIn: rep.cibaExpiresIn,
                cibaInterval: rep.cibaInterval,
                cibaAuthRequestedUserHint: rep.cibaAuthRequestedUserHint
            },
            t("sxAuthCibaPolicySaved"),
            t("sxAuthCibaPolicySaveError")
        );

    return (
        <>
            <SegmentTabs
                value={sub}
                onChange={setSub}
                items={POLICY_TABS.map(x => ({ value: x.value, label: x.raw ? x.label : t(x.label) }))}
                ariaLabel={t("sxAuthPolicyTabsLabel")}
            />

            {sub === "password" && (
                <>
                    <Section
                        label={t("sxAuthPasswordPolicy")}
                        action={
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        disabled={!availablePolicyTypes.length}
                                    >
                                        <PlusIcon /> {t("sxAuthAddPolicy")}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="max-h-80">
                                    {availablePolicyTypes.map((p: any) => (
                                        <DropdownMenuItem key={p.id} onClick={() => addPolicy(p)}>
                                            {p.displayName || p.id}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        }
                    >
                        {policyTokens.length === 0 ? (
                            <Notice
                                title={t("sxAuthNoPasswordPolicyTitle")}
                                description={t("sxAuthNoPasswordPolicyDescription")}
                            />
                        ) : (
                            <Group>
                                {policyTokens.map((p: any, idx: number) => (
                                    <li
                                        key={`${p.id}-${idx}`}
                                        className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <span className="min-w-0 text-base [overflow-wrap:anywhere]">
                                            {p.displayName || p.id}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-4">
                                            {p.configType && p.configType !== "boolean" ? (
                                                <Input
                                                    size="md"
                                                    aria-label={p.displayName || p.id}
                                                    value={p.value ?? ""}
                                                    onChange={(e: any) =>
                                                        setPolicyValue(idx, e.target.value)
                                                    }
                                                    className="w-24 sm:w-32"
                                                    type={p.configType === "int" ? "number" : "text"}
                                                />
                                            ) : null}
                                            <TextAction tone="danger" onClick={() => removePolicy(idx)}>
                                                {t("sxAuthRemove")}
                                            </TextAction>
                                        </div>
                                    </li>
                                ))}
                            </Group>
                        )}
                    </Section>
                    <SaveBar onClick={savePassword} saving={saving} />
                </>
            )}

            {sub === "otp" && (
                <>
                    <Section label={t("sxAuthOtpPolicy")}>
                        <FormCard>
                            <SelectField
                                label={t("sxAuthOtpType")}
                                value={rep.otpPolicyType ?? "totp"}
                                onChange={(v: string) => setField("otpPolicyType", v)}
                                options={OTP_TYPES.map(x => ({ value: x, label: x.toUpperCase() }))}
                            />
                            <SelectField
                                label={t("sxAuthOtpAlgorithm")}
                                value={rep.otpPolicyAlgorithm ?? "HmacSHA1"}
                                onChange={(v: string) => setField("otpPolicyAlgorithm", v)}
                                options={OTP_ALGORITHMS}
                            />
                            <SelectField
                                label={t("sxAuthOtpDigits")}
                                value={String(rep.otpPolicyDigits ?? 6)}
                                onChange={(v: string) => setField("otpPolicyDigits", Number(v))}
                                options={OTP_DIGITS}
                            />
                            <NumberField
                                label={t("sxAuthOtpPeriod")}
                                hint={t("sxAuthOtpPeriodHint")}
                                value={rep.otpPolicyPeriod ?? 30}
                                onChange={(v: number) => setField("otpPolicyPeriod", v)}
                            />
                            <NumberField
                                label={t("sxAuthOtpLookAhead")}
                                value={rep.otpPolicyLookAheadWindow ?? 1}
                                onChange={(v: number) => setField("otpPolicyLookAheadWindow", v)}
                            />
                        </FormCard>
                    </Section>
                    <SaveBar onClick={saveOtp} saving={saving} />
                </>
            )}

            {sub === "webauthn" && (
                <WebAuthnSection
                    rep={rep}
                    setField={setField}
                    prefix="webAuthnPolicy"
                    title={t("sxAuthWebauthnPolicy")}
                    save={() => saveWebauthn("webAuthnPolicy")}
                    saving={saving}
                />
            )}

            {sub === "passwordless" && (
                <WebAuthnSection
                    rep={rep}
                    setField={setField}
                    prefix="webAuthnPolicyPasswordless"
                    title={t("sxAuthWebauthnPasswordlessPolicy")}
                    save={() => saveWebauthn("webAuthnPolicyPasswordless")}
                    saving={saving}
                />
            )}

            {sub === "ciba" && (
                <>
                    <Section label={t("sxAuthCibaPolicy")}>
                        <FormCard>
                            <SelectField
                                label={t("sxAuthCibaDeliveryMode")}
                                value={rep.cibaBackchannelTokenDeliveryMode ?? "poll"}
                                onChange={(v: string) => setField("cibaBackchannelTokenDeliveryMode", v)}
                                options={CIBA_DELIVERY_MODES}
                            />
                            <SelectField
                                label={t("sxAuthCibaUserHint")}
                                value={rep.cibaAuthRequestedUserHint ?? "login_hint"}
                                onChange={(v: string) => setField("cibaAuthRequestedUserHint", v)}
                                options={CIBA_USER_HINTS}
                            />
                            <NumberField
                                label={t("sxAuthCibaExpiresIn")}
                                hint={t("sxAuthCibaExpiresInHint")}
                                value={rep.cibaExpiresIn ?? 120}
                                onChange={(v: number) => setField("cibaExpiresIn", v)}
                            />
                            <NumberField
                                label={t("sxAuthCibaInterval")}
                                value={rep.cibaInterval ?? 5}
                                onChange={(v: number) => setField("cibaInterval", v)}
                            />
                        </FormCard>
                    </Section>
                    <SaveBar onClick={saveCiba} saving={saving} />
                </>
            )}
        </>
    );
}

function WebAuthnSection({ rep, setField, prefix, title, save, saving }: any) {
    const t = useT();
    const sigSelected: string[] = rep[`${prefix}SignatureAlgorithms`] || [];
    const withLabels = (values: string[]) =>
        values.map(v => ({
            value: v,
            label: WEBAUTHN_OPTION_LABELS[v] ? t(WEBAUTHN_OPTION_LABELS[v]) : v
        }));
    return (
        <>
            <Section label={title}>
                <FormCard>
                    <FormField wide label={t("sxAuthRpName")} hint={t("sxAuthRpNameHint")}>
                        {(id: string) => (
                            <Input
                                id={id}
                                size="lg"
                                value={rep[`${prefix}RpEntityName`] ?? ""}
                                onChange={(e: any) => setField(`${prefix}RpEntityName`, e.target.value)}
                                placeholder="keycloak"
                            />
                        )}
                    </FormField>
                    <SelectField
                        label={t("sxAuthAttestationPreference")}
                        value={rep[`${prefix}AttestationConveyancePreference`] ?? "not specified"}
                        onChange={(v: string) => setField(`${prefix}AttestationConveyancePreference`, v)}
                        options={withLabels(ATTESTATION_PREFERENCE)}
                    />
                    <SelectField
                        label={t("sxAuthAuthenticatorAttachment")}
                        value={rep[`${prefix}AuthenticatorAttachment`] ?? "not specified"}
                        onChange={(v: string) => setField(`${prefix}AuthenticatorAttachment`, v)}
                        options={withLabels(AUTHENTICATOR_ATTACHMENT)}
                    />
                    <SelectField
                        label={t("sxAuthRequireResidentKey")}
                        value={rep[`${prefix}RequireResidentKey`] ?? "not specified"}
                        onChange={(v: string) => setField(`${prefix}RequireResidentKey`, v)}
                        options={withLabels(RESIDENT_KEY_OPTIONS)}
                    />
                    <SelectField
                        label={t("sxAuthUserVerification")}
                        value={rep[`${prefix}UserVerificationRequirement`] ?? "not specified"}
                        onChange={(v: string) => setField(`${prefix}UserVerificationRequirement`, v)}
                        options={withLabels(USER_VERIFY)}
                    />
                </FormCard>
            </Section>
            <Section label={t("sxAuthSignatureAlgorithms")}>
                <div className={cn(GROUP, "p-4")}>
                    <ToggleGroup
                        type="multiple"
                        variant="outline"
                        size="sm"
                        className="flex-wrap justify-start"
                        value={sigSelected}
                        onValueChange={(next: string[]) => setField(`${prefix}SignatureAlgorithms`, next)}
                        aria-label={t("sxAuthSignatureAlgorithms")}
                    >
                        {WEBAUTHN_SIG_ALGS.map(alg => (
                            <ToggleGroupItem key={alg} value={alg}>
                                {alg}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            </Section>
            <SaveBar onClick={save} saving={saving} />
        </>
    );
}

const POLICY_SEP = " and ";

function serializePolicy(tokens: any[]): string {
    return tokens
        .map(t => {
            const hasVal =
                t.configType &&
                t.configType !== "boolean" &&
                t.value !== undefined &&
                t.value !== "";
            return hasVal ? `${t.id}(${t.value})` : t.id;
        })
        .join(POLICY_SEP);
}

function parsePolicy(value: string, types: any[]): any[] {
    if (!value) return [];
    return value
        .split(POLICY_SEP)
        .map(token => parseToken(token))
        .filter(t => t.id)
        .map(t => {
            const match = types.find(p => p.id === t.id);
            return {
                id: t.id,
                value: t.value,
                displayName: match?.displayName,
                configType: match?.configType
            };
        });
}

function parseToken(token: string) {
    const trimmed = token.trim();
    const start = trimmed.indexOf("(");
    if (start === -1) return { id: trimmed };
    const id = trimmed.substring(0, start).trim();
    const end = trimmed.lastIndexOf(")");
    if (end === -1) return { id };
    return { id, value: trimmed.substring(start + 1, end) };
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
                    {opts?.message && (
                        <ConfirmDescription>{opts.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxAuthCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? t("sxAuthConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}
