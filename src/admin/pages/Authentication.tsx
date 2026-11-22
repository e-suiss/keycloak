// @ts-nocheck

import {
    ArrowDownIcon,
    ArrowUpIcon,
    CaretDownIcon,
    CaretRightIcon,
    CopyIcon,
    DotsThreeIcon,
    FingerprintIcon,
    FlowArrowIcon,
    GearSixIcon,
    GitBranchIcon,
    ListChecksIcon,
    PasswordIcon,
    PlusIcon,
    ShieldCheckIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel
} from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Spinner } from "@ui/components/spinner";
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
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";

/* ──────────────────────────────────────────────────────────────────────────
   Static option sets (verified against the upstream keycloak-admin-ui).
   ──────────────────────────────────────────────────────────────────────── */

const SUB_TABS = [
    { value: "flows", label: "Akışlar" },
    { value: "actions", label: "Gerekli eylemler" },
    { value: "policies", label: "Politikalar" }
];

const REQUIREMENTS = ["REQUIRED", "ALTERNATIVE", "DISABLED", "CONDITIONAL"] as const;
const REQUIREMENT_LABELS: Record<string, string> = {
    REQUIRED: "Zorunlu",
    ALTERNATIVE: "Alternatif",
    DISABLED: "Devre dışı",
    CONDITIONAL: "Koşullu"
};

const BINDINGS: { key: string; label: string }[] = [
    { key: "browserFlow", label: "Tarayıcı akışı" },
    { key: "registrationFlow", label: "Kayıt akışı" },
    { key: "directGrantFlow", label: "Doğrudan erişim" },
    { key: "resetCredentialsFlow", label: "Kimlik bilgisi sıfırlama" },
    { key: "clientAuthenticationFlow", label: "İstemci doğrulama" },
    { key: "dockerAuthenticationFlow", label: "Docker doğrulama" }
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

const CIBA_DELIVERY_MODES = ["poll", "ping"];
const CIBA_USER_HINTS = ["login_hint", "id_token_hint", "login_hint_token"];

/* ──────────────────────────────────────────────────────────────────────────
   Small shared select wrapper (ui Select only).
   ──────────────────────────────────────────────────────────────────────── */

const PICK_NONE = "__none__";

function Pick({
    value,
    onChange,
    options,
    placeholder = "Seç",
    className,
    "aria-label": ariaLabel
}: any) {
    // Radix Select reserves "" for "no selection"; an option with value "" maps to NONE.
    const hasEmptyOption = options.some((o: any) => (typeof o === "string" ? o : o.value) === "");
    const current = value ?? "";
    return (
        <Select
            value={current === "" && hasEmptyOption ? PICK_NONE : current}
            onValueChange={(v: string) => onChange(v === PICK_NONE ? "" : v)}
        >
            <SelectTrigger size="sm" aria-label={ariaLabel} className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent align="end">
                {options.map((o: any) => {
                    const v = typeof o === "string" ? o : o.value;
                    const l = typeof o === "string" ? o : o.label;
                    return (
                        <SelectItem key={v} value={v === "" ? PICK_NONE : v}>
                            {l}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────────────── */

export default function Authentication() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();

    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("flows");

    const [flows, setFlows] = useState<any[]>([]);
    const [requiredActions, setRequiredActions] = useState<any[]>([]);
    const [rep, setRep] = useState<any>(null);
    const [passwordPolicyTypes, setPasswordPolicyTypes] = useState<any[]>([]);

    // flow detail
    const [openFlow, setOpenFlow] = useState<string | null>(null);
    const [executions, setExecutions] = useState<any[]>([]);
    const [execLoading, setExecLoading] = useState(false);

    // modals
    const [dupTarget, setDupTarget] = useState<any>(null);
    const [dupName, setDupName] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        alias: "",
        description: "",
        providerId: "basic-flow"
    });

    const [saving, setSaving] = useState(false);

    /* ── data loading ─────────────────────────────────────────────────── */

    const load = async (alive = { current: true }) => {
        setLoading(true);
        try {
            const [flowsRes, actionsRes, realmRep, info] = await Promise.all([
                adminClient.authenticationManagement.getFlows().catch(() => []),
                adminClient.authenticationManagement.getRequiredActions().catch(() => []),
                adminClient.realms.findOne({ realm }).catch(() => ({})),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            if (!alive.current) return;
            setFlows(Array.isArray(flowsRes) ? flowsRes : []);
            setRequiredActions(Array.isArray(actionsRes) ? actionsRes : []);
            setRep(realmRep || {});
            setPasswordPolicyTypes(info?.passwordPolicies || []);
        } finally {
            if (alive.current) setLoading(false);
        }
    };

    useEffect(() => {
        const alive = { current: true };
        load(alive);
        return () => {
            alive.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

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

    /* ── flows ────────────────────────────────────────────────────────── */

    const topLevelFlows = useMemo(() => flows.filter(f => f?.topLevel), [flows]);
    const topLevelAliases = topLevelFlows.map(f => f.alias);

    const loadExecutions = async (flowAlias: string) => {
        setExecLoading(true);
        try {
            const res = await adminClient.authenticationManagement.getExecutions({
                flow: flowAlias
            });
            setExecutions(Array.isArray(res) ? res : []);
        } catch (err) {
            addError("Adımlar yüklenemedi.", err);
            setExecutions([]);
        } finally {
            setExecLoading(false);
        }
    };

    const toggleFlow = async (flow: any) => {
        if (openFlow === flow.alias) {
            setOpenFlow(null);
            setExecutions([]);
            return;
        }
        setOpenFlow(flow.alias);
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
            addAlert("Adım gereksinimi güncellendi.", AlertVariant.success);
            await loadExecutions(flowAlias);
        } catch (err) {
            addError("Adım güncellenemedi.", err);
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
            await loadExecutions(flowAlias);
        } catch (err) {
            addError("Sıra değiştirilemedi.", err);
        }
    };

    /* ── execution config (gear) ──────────────────────────────────────────
       A configurable execution (configurable=true) carries an authenticator
       config — e.g. the "Registration: KYC Mode" step's a1/l1 dropdown, or each
       "Terms & Conditions" document. The form is generated from the provider's
       config-description so any configurable step is editable here. */
    const [cfgExec, setCfgExec] = useState<any>(null);
    const [cfgDesc, setCfgDesc] = useState<any>(null);
    const [cfgValues, setCfgValues] = useState<Record<string, any>>({});
    const [cfgAlias, setCfgAlias] = useState("");
    const [cfgLoading, setCfgLoading] = useState(false);
    const [cfgSaving, setCfgSaving] = useState(false);

    const openConfig = async (exec: any) => {
        setCfgExec(exec);
        setCfgDesc(null);
        setCfgValues({});
        setCfgAlias("");
        setCfgLoading(true);
        try {
            const desc = await adminClient.authenticationManagement.getConfigDescription({
                providerId: exec.providerId
            });
            setCfgDesc(desc || { properties: [] });
            if (exec.authenticationConfig) {
                const cfg = await adminClient.authenticationManagement.getConfig({
                    id: exec.authenticationConfig
                });
                setCfgAlias(cfg?.alias || `${exec.providerId}-config`);
                setCfgValues({ ...(cfg?.config || {}) });
            } else {
                const defaults: Record<string, any> = {};
                (desc?.properties || []).forEach((p: any) => {
                    if (p.defaultValue !== undefined && p.defaultValue !== null)
                        defaults[p.name] = String(p.defaultValue);
                });
                setCfgValues(defaults);
                setCfgAlias(`${exec.providerId}-config`);
            }
        } catch (err) {
            addError("Adım yapılandırması yüklenemedi.", err);
            setCfgExec(null);
        } finally {
            setCfgLoading(false);
        }
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
            addAlert("Adım yapılandırması kaydedildi.", AlertVariant.success);
            const flowAlias = openFlow;
            setCfgExec(null);
            if (flowAlias) await loadExecutions(flowAlias);
        } catch (err) {
            addError("Yapılandırma kaydedilemedi.", err);
        } finally {
            setCfgSaving(false);
        }
    };

    const submitDuplicate = async () => {
        if (!dupTarget || !dupName.trim()) return;
        try {
            await adminClient.authenticationManagement.copyFlow({
                flow: dupTarget.alias,
                newName: dupName.trim()
            });
            addAlert("Akış kopyalandı.", AlertVariant.success);
            setDupTarget(null);
            setDupName("");
            await load();
        } catch (err) {
            addError("Akış kopyalanamadı.", err);
        }
    };

    const deleteFlow = (flow: any) =>
        confirm({
            title: "Akışı sil",
            message: `“${flow.alias}” akışını silmek istediğinize emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.authenticationManagement.deleteFlow({
                        flowId: flow.id
                    });
                    addAlert("Akış silindi.", AlertVariant.success);
                    if (openFlow === flow.alias) {
                        setOpenFlow(null);
                        setExecutions([]);
                    }
                    await load();
                } catch (err) {
                    addError("Akış silinemedi.", err);
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
            addAlert("Akış oluşturuldu.", AlertVariant.success);
            setCreateOpen(false);
            setCreateForm({ alias: "", description: "", providerId: "basic-flow" });
            await load();
        } catch (err) {
            addError("Akış oluşturulamadı.", err);
        }
    };

    /* ── required actions ─────────────────────────────────────────────── */

    const sortedActions = useMemo(
        () =>
            [...requiredActions].sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0)),
        [requiredActions]
    );

    const updateAction = async (action: any, patch: any) => {
        try {
            await adminClient.authenticationManagement.updateRequiredAction(
                { alias: action.alias },
                { ...action, ...patch }
            );
            addAlert("Gerekli eylem güncellendi.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Gerekli eylem güncellenemedi.", err);
        }
    };

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
            addError("Öncelik değiştirilemedi.", err);
        }
    };

    /* ── password policy builder ──────────────────────────────────────── */

    const policyTokens = useMemo(
        () => parsePolicy(rep?.passwordPolicy || "", passwordPolicyTypes),
        [rep?.passwordPolicy, passwordPolicyTypes]
    );
    const usedPolicyIds = new Set(policyTokens.map(t => t.id));
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
        const next = policyTokens.map((t, i) => (i === idx ? { ...t, value } : t));
        setField("passwordPolicy", serializePolicy(next));
    };
    const removePolicy = (idx: number) => {
        const next = policyTokens.filter((_, i) => i !== idx);
        setField("passwordPolicy", serializePolicy(next));
    };

    /* ── render ───────────────────────────────────────────────────────── */

    if (loading || !rep) {
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex justify-center">
                <SegmentPicker value={tab} onValueChange={setTab} aria-label="Bölüm">
                    {SUB_TABS.map(o => (
                        <SegmentPickerItem key={o.value} value={o.value} label={o.label} />
                    ))}
                </SegmentPicker>
            </div>

            <div className="mx-auto w-full max-w-2xl space-y-6">
                {tab === "flows" && (
                    <FlowsTab
                        flows={flows}
                        topLevelFlows={topLevelFlows}
                        topLevelAliases={topLevelAliases}
                        openFlow={openFlow}
                        executions={executions}
                        execLoading={execLoading}
                        toggleFlow={toggleFlow}
                        changeRequirement={changeRequirement}
                        moveExec={moveExec}
                        onConfigure={openConfig}
                        onDuplicate={(f: any) => {
                            setDupTarget(f);
                            setDupName(`${f.alias} kopya`);
                        }}
                        onDelete={deleteFlow}
                        onCreate={() => setCreateOpen(true)}
                        bindings={rep}
                        onBind={(k: string, v: string) =>
                            persist(
                                { [k]: v || undefined },
                                "Akış bağlaması kaydedildi.",
                                "Bağlama kaydedilemedi."
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
            </div>

            {/* duplicate flow modal */}
            <Modal open={!!dupTarget} onOpenChange={o => !o && setDupTarget(null)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>Akışı kopyala</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <p className="text-sm text-muted-foreground">
                                “{dupTarget?.alias}” akışının bir kopyası oluşturulacak.
                            </p>
                            <Field>
                                <FieldLabel>Yeni akış adı</FieldLabel>
                                <Input
                                    value={dupName}
                                    onChange={(e: any) => setDupName(e.target.value)}
                                    placeholder="Akış adı"
                                />
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={submitDuplicate} disabled={!dupName.trim()}>
                            Kopyala
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* create flow modal */}
            <Modal open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>Akış oluştur</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Ad</FieldLabel>
                                <Input
                                    value={createForm.alias}
                                    onChange={(e: any) =>
                                        setCreateForm(p => ({ ...p, alias: e.target.value }))
                                    }
                                    placeholder="Örn. Özel tarayıcı akışı"
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Açıklama</FieldLabel>
                                <Input
                                    value={createForm.description}
                                    onChange={(e: any) =>
                                        setCreateForm(p => ({
                                            ...p,
                                            description: e.target.value
                                        }))
                                    }
                                    placeholder="İsteğe bağlı"
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Akış türü</FieldLabel>
                                <Pick
                                    value={createForm.providerId}
                                    onChange={(v: string) =>
                                        setCreateForm(p => ({ ...p, providerId: v }))
                                    }
                                    options={[
                                        { value: "basic-flow", label: "Temel akış" },
                                        { value: "client-flow", label: "İstemci akışı" }
                                    ]}
                                    aria-label="Akış türü"
                                />
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={submitCreate} disabled={!createForm.alias.trim()}>
                            Oluştur
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* execution config modal (gear) */}
            <Modal open={!!cfgExec} onOpenChange={o => !o && setCfgExec(null)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{`Yapılandırma — ${cfgExec?.displayName || cfgExec?.providerId || ""}`}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {cfgLoading ? (
                            <div className="flex justify-center py-8">
                                <Spinner className="size-6" />
                            </div>
                        ) : (cfgDesc?.properties || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Bu adımın yapılandırılabilir alanı yok.
                            </p>
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
                        <Button onClick={saveConfig} disabled={cfgSaving || cfgLoading}>
                            Kaydet
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {confirmNode}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   One config property → the matching control (List→select, boolean→switch,
   Text→textarea, otherwise text/number/password input).
   ──────────────────────────────────────────────────────────────────────── */

function ConfigField({ prop, value, onChange }: any) {
    const type = String(prop.type || "String").toLowerCase();
    const label = prop.label || prop.name;
    const hint = prop.helpText ? <FieldDescription>{prop.helpText}</FieldDescription> : null;
    if (type === "boolean") {
        return (
            <Field>
                <FieldLabel>{label}</FieldLabel>
                <Switch
                    checked={value === true || value === "true"}
                    onCheckedChange={(v: boolean) => onChange(v)}
                />
                {hint}
            </Field>
        );
    }
    if (type === "list" && prop.options?.length) {
        // Native <select> (no portal) — a Radix Select would open *behind* the
        // dialog overlay (z-50 content vs z-100 overlay) and look like it never
        // opened.
        return (
            <Field>
                <FieldLabel>{label}</FieldLabel>
                <NativeSelect
                    value={value ?? ""}
                    onChange={(e: any) => onChange(e.target.value)}
                    aria-label={label}
                    className="w-full"
                >
                    {value === undefined || value === "" ? (
                        <NativeSelectOption value="" disabled>
                            Seç
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
            <Field>
                <FieldLabel>{label}</FieldLabel>
                <Textarea
                    value={value ?? ""}
                    onChange={(e: any) => onChange(e.target.value)}
                    placeholder={prop.placeholder}
                />
                {hint}
            </Field>
        );
    }
    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <Input
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

/* ── small layout helpers built from esuiss pieces ───────────────────── */

function GroupCaption({ children }: { children: ReactNode }) {
    return (
        <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">{children}</h3>
    );
}

/** Label-left / control-right settings row inside an inset ItemGroup. */
function SettingRow({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle className="font-normal">{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions>{children}</ItemActions>
        </Item>
    );
}

/** Insert ItemSeparators between rows. */
function withSeparators(nodes: ReactNode[]) {
    return nodes.map((n, i) => (
        <Fragment key={i}>
            {i > 0 && <ItemSeparator />}
            {n}
        </Fragment>
    ));
}

function EmptyBlock({ icon, title, desc, action }: any) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">{icon}</EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                {desc && <EmptyDescription>{desc}</EmptyDescription>}
            </EmptyHeader>
            {action && <EmptyContent>{action}</EmptyContent>}
        </Empty>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Flows tab
   ──────────────────────────────────────────────────────────────────────── */

function FlowsTab({
    flows,
    topLevelFlows,
    topLevelAliases,
    openFlow,
    executions,
    execLoading,
    toggleFlow,
    changeRequirement,
    moveExec,
    onConfigure,
    onDuplicate,
    onDelete,
    onCreate,
    bindings,
    onBind,
    saving
}: any) {
    if (!topLevelFlows.length) {
        return (
            <EmptyBlock
                icon={<FlowArrowIcon />}
                title="Akış yok"
                desc="Bu realm için tanımlı kimlik doğrulama akışı bulunamadı."
                action={<Button onClick={onCreate}>Akış oluştur</Button>}
            />
        );
    }

    return (
        <>
            {/* bindings */}
            <div>
                <GroupCaption>Akış bağlamaları</GroupCaption>
                <ItemGroup variant="inset">
                    {withSeparators(
                        BINDINGS.map(({ key, label }) => (
                            <SettingRow key={key} label={label}>
                                <Pick
                                    value={bindings?.[key] ?? ""}
                                    onChange={(v: string) => onBind(key, v)}
                                    options={[
                                        { value: "", label: "—" },
                                        ...topLevelAliases.map((a: string) => ({
                                            value: a,
                                            label: a
                                        }))
                                    ]}
                                    placeholder="—"
                                    aria-label={label}
                                />
                            </SettingRow>
                        ))
                    )}
                </ItemGroup>
            </div>

            {/* flow list */}
            <div>
                <div className="mb-2 ms-1 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Akışlar</h3>
                    <Button variant="plain" size="sm" onClick={onCreate}>
                        <PlusIcon /> Akış oluştur
                    </Button>
                </div>
                <ItemGroup variant="inset">
                    {withSeparators(
                        topLevelFlows.map((flow: any) => {
                            const isOpen = openFlow === flow.alias;
                            return (
                                <div key={flow.id || flow.alias}>
                                    <Item size="sm">
                                        <Item size="xs" asChild className="min-w-0 flex-1 p-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleFlow(flow)}
                                                className="text-start"
                                            >
                                                <ItemMedia variant="icon">
                                                    {isOpen ? (
                                                        <CaretDownIcon className="text-muted-foreground" />
                                                    ) : (
                                                        <CaretRightIcon className="text-muted-foreground rtl:rotate-180" />
                                                    )}
                                                </ItemMedia>
                                                <ItemContent className="min-w-0">
                                                    <ItemTitle className="font-normal">
                                                        {flow.alias}
                                                    </ItemTitle>
                                                    {flow.description && (
                                                        <ItemDescription className="truncate">
                                                            {flow.description}
                                                        </ItemDescription>
                                                    )}
                                                </ItemContent>
                                            </button>
                                        </Item>
                                        <ItemActions>
                                            {flow.builtIn ? (
                                                <Badge variant="secondary">Yerleşik</Badge>
                                            ) : (
                                                <Badge>Özel</Badge>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label="Eylemler"
                                                    >
                                                        <DotsThreeIcon
                                                            className="size-5"
                                                            weight="bold"
                                                        />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => onDuplicate(flow)}
                                                    >
                                                        <CopyIcon /> Kopyala
                                                    </DropdownMenuItem>
                                                    {!flow.builtIn && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onClick={() => onDelete(flow)}
                                                            >
                                                                <TrashIcon /> Sil
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </ItemActions>
                                    </Item>

                                    {isOpen && (
                                        <>
                                            <ItemSeparator />
                                            {execLoading ? (
                                                <div className="flex justify-center px-4 py-6">
                                                    <Spinner className="size-6" />
                                                </div>
                                            ) : executions.length === 0 ? (
                                                <Item size="sm">
                                                    <ItemContent>
                                                        <ItemDescription className="text-center">
                                                            Bu akışta adım yok.
                                                        </ItemDescription>
                                                    </ItemContent>
                                                </Item>
                                            ) : (
                                                withSeparators(
                                                    executions.map((ex: any, i: number) => (
                                                        <Item
                                                            key={ex.id || i}
                                                            size="xs"
                                                            role="listitem"
                                                            style={{
                                                                paddingInlineStart:
                                                                    16 + (ex.level || 0) * 20
                                                            }}
                                                        >
                                                            {ex.level > 0 && (
                                                                <ItemMedia variant="icon">
                                                                    <GitBranchIcon className="text-muted-foreground" />
                                                                </ItemMedia>
                                                            )}
                                                            <ItemContent className="min-w-0">
                                                                <ItemTitle className="text-sm font-normal">
                                                                    {ex.displayName ||
                                                                        ex.providerId}
                                                                    {ex.authenticationFlow && (
                                                                        <Badge variant="secondary">
                                                                            alt akış
                                                                        </Badge>
                                                                    )}
                                                                </ItemTitle>
                                                            </ItemContent>
                                                            <ItemActions>
                                                                {ex.configurable && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        aria-label="Yapılandır"
                                                                        title="Yapılandır"
                                                                        onClick={() =>
                                                                            onConfigure(ex)
                                                                        }
                                                                    >
                                                                        <GearSixIcon />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    aria-label="Yukarı taşı"
                                                                    onClick={() =>
                                                                        moveExec(
                                                                            flow.alias,
                                                                            ex,
                                                                            "up"
                                                                        )
                                                                    }
                                                                >
                                                                    <ArrowUpIcon />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    aria-label="Aşağı taşı"
                                                                    onClick={() =>
                                                                        moveExec(
                                                                            flow.alias,
                                                                            ex,
                                                                            "down"
                                                                        )
                                                                    }
                                                                >
                                                                    <ArrowDownIcon />
                                                                </Button>
                                                                <Pick
                                                                    value={ex.requirement}
                                                                    onChange={(v: string) =>
                                                                        changeRequirement(
                                                                            flow.alias,
                                                                            ex,
                                                                            v
                                                                        )
                                                                    }
                                                                    options={(ex
                                                                        .requirementChoices
                                                                        ?.length
                                                                        ? ex.requirementChoices
                                                                        : REQUIREMENTS
                                                                    ).map((r: string) => ({
                                                                        value: r,
                                                                        label:
                                                                            REQUIREMENT_LABELS[
                                                                                r
                                                                            ] || r
                                                                    }))}
                                                                    aria-label="Gereksinim"
                                                                    className="w-30"
                                                                />
                                                            </ItemActions>
                                                        </Item>
                                                    ))
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </ItemGroup>
            </div>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Required actions tab
   ──────────────────────────────────────────────────────────────────────── */

function RequiredActionsTab({ actions, onUpdate, onMove }: any) {
    if (!actions.length) {
        return (
            <EmptyBlock
                icon={<ListChecksIcon />}
                title="Gerekli eylem yok"
                desc="Tanımlı gerekli eylem bulunamadı."
            />
        );
    }
    return (
        <div>
            <GroupCaption>Gerekli eylemler</GroupCaption>
            <ItemGroup variant="inset">
                {withSeparators(
                    actions.map((a: any, i: number) => (
                        <Item key={a.alias} size="sm">
                            <ItemMedia className="flex-col gap-0.5">
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label="Yukarı taşı"
                                    onClick={() => onMove(a, "up")}
                                    disabled={i === 0}
                                >
                                    <ArrowUpIcon />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label="Aşağı taşı"
                                    onClick={() => onMove(a, "down")}
                                    disabled={i === actions.length - 1}
                                >
                                    <ArrowDownIcon />
                                </Button>
                            </ItemMedia>
                            <ItemContent className="min-w-0">
                                <ItemTitle className="font-normal">
                                    {a.name || a.alias}
                                </ItemTitle>
                            </ItemContent>
                            <ItemActions className="gap-5">
                                <Field orientation="horizontal" className="w-auto gap-2">
                                    <FieldLabel
                                        htmlFor={`ra-enabled-${a.alias}`}
                                        className="text-xs text-muted-foreground"
                                    >
                                        Etkin
                                    </FieldLabel>
                                    <Switch
                                        id={`ra-enabled-${a.alias}`}
                                        size="sm"
                                        checked={!!a.enabled}
                                        onCheckedChange={(v: boolean) =>
                                            onUpdate(a, { enabled: v })
                                        }
                                    />
                                </Field>
                                <Field orientation="horizontal" className="w-auto gap-2">
                                    <FieldLabel
                                        htmlFor={`ra-defaultAction-${a.alias}`}
                                        className="text-xs text-muted-foreground"
                                    >
                                        Varsayılan
                                    </FieldLabel>
                                    <Switch
                                        id={`ra-defaultAction-${a.alias}`}
                                        size="sm"
                                        checked={!!a.defaultAction}
                                        onCheckedChange={(v: boolean) =>
                                            onUpdate(a, { defaultAction: v })
                                        }
                                        disabled={!a.enabled}
                                    />
                                </Field>
                            </ItemActions>
                        </Item>
                    ))
                )}
            </ItemGroup>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Policies tab
   ──────────────────────────────────────────────────────────────────────── */

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
    const [sub, setSub] = useState("password");

    const savePassword = () =>
        persist(
            { passwordPolicy: rep.passwordPolicy ?? "" },
            "Şifre politikası kaydedildi.",
            "Şifre politikası kaydedilemedi."
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
            "OTP politikası kaydedildi.",
            "OTP politikası kaydedilemedi."
        );

    const saveWebauthn = (prefix: string) =>
        persist(
            {
                [`${prefix}RpEntityName`]: rep[`${prefix}RpEntityName`],
                [`${prefix}SignatureAlgorithms`]: rep[`${prefix}SignatureAlgorithms`],
                [`${prefix}AttestationConveyancePreference`]:
                    rep[`${prefix}AttestationConveyancePreference`],
                [`${prefix}AuthenticatorAttachment`]:
                    rep[`${prefix}AuthenticatorAttachment`],
                [`${prefix}RequireResidentKey`]: rep[`${prefix}RequireResidentKey`],
                [`${prefix}UserVerificationRequirement`]:
                    rep[`${prefix}UserVerificationRequirement`]
            },
            "WebAuthn politikası kaydedildi.",
            "WebAuthn politikası kaydedilemedi."
        );

    const saveCiba = () =>
        persist(
            {
                cibaBackchannelTokenDeliveryMode: rep.cibaBackchannelTokenDeliveryMode,
                cibaExpiresIn: rep.cibaExpiresIn,
                cibaInterval: rep.cibaInterval,
                cibaAuthRequestedUserHint: rep.cibaAuthRequestedUserHint
            },
            "CIBA politikası kaydedildi.",
            "CIBA politikası kaydedilemedi."
        );

    const SAVE = (onClick: any) => (
        <div className="flex justify-end">
            <Button onClick={onClick} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
        </div>
    );

    return (
        <>
            <div className="flex justify-center">
                <SegmentPicker value={sub} onValueChange={setSub} aria-label="Politika">
                    {[
                        { value: "password", label: "Şifre" },
                        { value: "otp", label: "OTP" },
                        { value: "webauthn", label: "WebAuthn" },
                        { value: "passwordless", label: "Passwordless" },
                        { value: "ciba", label: "CIBA" }
                    ].map(o => (
                        <SegmentPickerItem key={o.value} value={o.value} label={o.label} />
                    ))}
                </SegmentPicker>
            </div>

            {sub === "password" && (
                <div className="space-y-4">
                    <div>
                        <div className="mb-2 ms-1 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Şifre politikası
                            </h3>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        disabled={!availablePolicyTypes.length}
                                    >
                                        <PlusIcon /> Politika ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {availablePolicyTypes.map((p: any) => (
                                        <DropdownMenuItem
                                            key={p.id}
                                            onClick={() => addPolicy(p)}
                                        >
                                            {p.displayName || p.id}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {policyTokens.length === 0 ? (
                            <EmptyBlock
                                icon={<PasswordIcon />}
                                title="Politika tanımlı değil"
                                desc="Yukarıdan bir şifre politikası türü ekleyin."
                            />
                        ) : (
                            <ItemGroup variant="inset">
                                {withSeparators(
                                    policyTokens.map((t: any, idx: number) => (
                                        <Item key={`${t.id}-${idx}`} size="sm">
                                            <ItemContent className="min-w-0">
                                                <ItemTitle className="font-normal">
                                                    {t.displayName || t.id}
                                                </ItemTitle>
                                            </ItemContent>
                                            <ItemActions>
                                                {t.configType &&
                                                t.configType !== "boolean" ? (
                                                    <Input
                                                        size="sm"
                                                        value={t.value ?? ""}
                                                        onChange={(e: any) =>
                                                            setPolicyValue(
                                                                idx,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-28"
                                                        type={
                                                            t.configType === "int"
                                                                ? "number"
                                                                : "text"
                                                        }
                                                    />
                                                ) : null}
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="Kaldır"
                                                    onClick={() => removePolicy(idx)}
                                                >
                                                    <TrashIcon />
                                                </Button>
                                            </ItemActions>
                                        </Item>
                                    ))
                                )}
                            </ItemGroup>
                        )}
                    </div>
                    {SAVE(savePassword)}
                </div>
            )}

            {sub === "otp" && (
                <div className="space-y-4">
                    <div>
                        <GroupCaption>Tek kullanımlık şifre (OTP)</GroupCaption>
                        <ItemGroup variant="inset">
                            <SettingRow label="Tür">
                                <Pick
                                    value={rep.otpPolicyType ?? "totp"}
                                    onChange={(v: string) => setField("otpPolicyType", v)}
                                    options={OTP_TYPES.map(t => ({
                                        value: t,
                                        label: t.toUpperCase()
                                    }))}
                                    aria-label="OTP türü"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow label="Hash algoritması">
                                <Pick
                                    value={rep.otpPolicyAlgorithm ?? "HmacSHA1"}
                                    onChange={(v: string) =>
                                        setField("otpPolicyAlgorithm", v)
                                    }
                                    options={OTP_ALGORITHMS}
                                    aria-label="Algoritma"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow label="Basamak sayısı">
                                <Pick
                                    value={String(rep.otpPolicyDigits ?? 6)}
                                    onChange={(v: string) =>
                                        setField("otpPolicyDigits", Number(v))
                                    }
                                    options={OTP_DIGITS}
                                    aria-label="Basamak"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow
                                label="Periyot (sn)"
                                hint="TOTP için geçerlilik penceresi"
                            >
                                <Input
                                    type="number"
                                    value={rep.otpPolicyPeriod ?? 30}
                                    onChange={(e: any) =>
                                        setField(
                                            "otpPolicyPeriod",
                                            Number(e.target.value)
                                        )
                                    }
                                    size="sm"
                                    className="w-24 text-end"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow label="İleri bakış penceresi">
                                <Input
                                    type="number"
                                    value={rep.otpPolicyLookAheadWindow ?? 1}
                                    onChange={(e: any) =>
                                        setField(
                                            "otpPolicyLookAheadWindow",
                                            Number(e.target.value)
                                        )
                                    }
                                    size="sm"
                                    className="w-24 text-end"
                                />
                            </SettingRow>
                        </ItemGroup>
                    </div>
                    {SAVE(saveOtp)}
                </div>
            )}

            {sub === "webauthn" && (
                <WebAuthnSection
                    rep={rep}
                    setField={setField}
                    prefix="webAuthnPolicy"
                    title="WebAuthn politikası"
                    icon={<FingerprintIcon />}
                    save={() => saveWebauthn("webAuthnPolicy")}
                    saving={saving}
                    SAVE={SAVE}
                />
            )}

            {sub === "passwordless" && (
                <WebAuthnSection
                    rep={rep}
                    setField={setField}
                    prefix="webAuthnPolicyPasswordless"
                    title="WebAuthn passwordless politikası"
                    icon={<ShieldCheckIcon />}
                    save={() => saveWebauthn("webAuthnPolicyPasswordless")}
                    saving={saving}
                    SAVE={SAVE}
                />
            )}

            {sub === "ciba" && (
                <div className="space-y-4">
                    <div>
                        <GroupCaption>CIBA politikası</GroupCaption>
                        <ItemGroup variant="inset">
                            <SettingRow label="Token iletim modu">
                                <Pick
                                    value={rep.cibaBackchannelTokenDeliveryMode ?? "poll"}
                                    onChange={(v: string) =>
                                        setField("cibaBackchannelTokenDeliveryMode", v)
                                    }
                                    options={CIBA_DELIVERY_MODES}
                                    aria-label="İletim modu"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow label="Kullanıcı ipucu">
                                <Pick
                                    value={rep.cibaAuthRequestedUserHint ?? "login_hint"}
                                    onChange={(v: string) =>
                                        setField("cibaAuthRequestedUserHint", v)
                                    }
                                    options={CIBA_USER_HINTS}
                                    aria-label="Kullanıcı ipucu"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow label="Süre (sn)" hint="İsteğin geçerlilik süresi">
                                <Input
                                    type="number"
                                    value={rep.cibaExpiresIn ?? 120}
                                    onChange={(e: any) =>
                                        setField("cibaExpiresIn", Number(e.target.value))
                                    }
                                    size="sm"
                                    className="w-24 text-end"
                                />
                            </SettingRow>
                            <ItemSeparator />
                            <SettingRow label="Poll aralığı (sn)">
                                <Input
                                    type="number"
                                    value={rep.cibaInterval ?? 5}
                                    onChange={(e: any) =>
                                        setField("cibaInterval", Number(e.target.value))
                                    }
                                    size="sm"
                                    className="w-24 text-end"
                                />
                            </SettingRow>
                        </ItemGroup>
                    </div>
                    {SAVE(saveCiba)}
                </div>
            )}
        </>
    );
}

function WebAuthnSection({ rep, setField, prefix, title, icon, save, SAVE }: any) {
    const sigSelected: string[] = rep[`${prefix}SignatureAlgorithms`] || [];
    return (
        <div className="space-y-4">
            <div>
                <GroupCaption>{title}</GroupCaption>
                <ItemGroup variant="inset">
                    <Item size="sm">
                        <ItemContent>
                            <ItemTitle className="font-normal">RP görünen adı</ItemTitle>
                            <ItemDescription>Relying Party (kuruluş) adı</ItemDescription>
                            <Input
                                size="md"
                                className="mt-1.5"
                                value={rep[`${prefix}RpEntityName`] ?? ""}
                                onChange={(e: any) =>
                                    setField(`${prefix}RpEntityName`, e.target.value)
                                }
                                placeholder="keycloak"
                            />
                        </ItemContent>
                    </Item>
                    <ItemSeparator />
                    <SettingRow label="Attestation tercihi">
                        <Pick
                            value={
                                rep[`${prefix}AttestationConveyancePreference`] ??
                                "not specified"
                            }
                            onChange={(v: string) =>
                                setField(`${prefix}AttestationConveyancePreference`, v)
                            }
                            options={ATTESTATION_PREFERENCE}
                            aria-label="Attestation"
                        />
                    </SettingRow>
                    <ItemSeparator />
                    <SettingRow label="Authenticator bağlantısı">
                        <Pick
                            value={
                                rep[`${prefix}AuthenticatorAttachment`] ?? "not specified"
                            }
                            onChange={(v: string) =>
                                setField(`${prefix}AuthenticatorAttachment`, v)
                            }
                            options={AUTHENTICATOR_ATTACHMENT}
                            aria-label="Authenticator bağlantısı"
                        />
                    </SettingRow>
                    <ItemSeparator />
                    <SettingRow label="Resident key gerektir">
                        <Pick
                            value={rep[`${prefix}RequireResidentKey`] ?? "not specified"}
                            onChange={(v: string) =>
                                setField(`${prefix}RequireResidentKey`, v)
                            }
                            options={RESIDENT_KEY_OPTIONS}
                            aria-label="Resident key"
                        />
                    </SettingRow>
                    <ItemSeparator />
                    <SettingRow label="Kullanıcı doğrulama">
                        <Pick
                            value={
                                rep[`${prefix}UserVerificationRequirement`] ??
                                "not specified"
                            }
                            onChange={(v: string) =>
                                setField(`${prefix}UserVerificationRequirement`, v)
                            }
                            options={USER_VERIFY}
                            aria-label="Kullanıcı doğrulama"
                        />
                    </SettingRow>
                </ItemGroup>
            </div>
            <div>
                <GroupCaption>İmza algoritmaları</GroupCaption>
                <ItemGroup variant="inset">
                    <Item size="sm">
                        <ToggleGroup
                            type="multiple"
                            variant="outline"
                            size="sm"
                            className="flex-wrap"
                            value={sigSelected}
                            onValueChange={(next: string[]) =>
                                setField(`${prefix}SignatureAlgorithms`, next)
                            }
                            aria-label="İmza algoritmaları"
                        >
                            {WEBAUTHN_SIG_ALGS.map(alg => (
                                <ToggleGroupItem key={alg} value={alg}>
                                    {alg}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </Item>
                </ItemGroup>
            </div>
            {SAVE(save)}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Password policy (de)serialization — mirrors upstream util.ts.
   "id(value) and id2(value2)" ; bare "id" when no value/config.
   ──────────────────────────────────────────────────────────────────────── */

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

/** Confirm dialog — returns a [confirm(opts), node] pair (built on @ui/patterns/confirm). */
function useConfirm() {
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
                    <ConfirmCancel>Vazgeç</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}
