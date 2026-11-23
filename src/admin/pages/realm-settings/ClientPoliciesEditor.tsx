// @ts-nocheck

import { Button } from "@ui/components/button";
import { Switch } from "@ui/components/switch";
import { useEffect, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, GROUP, ListSkeleton, Notice, Section, SegmentTabs, SEPARATOR, TextAction } from "../../ui/kit";
import CpPolicyForm from "./cp-policy-form";
import CpProfileForm from "./cp-profile-form";
import { AddLabel, ConfirmDialog, ErrorNote, JsonCard, ListRow, SaveBar } from "./cp-ui";

const EXECUTOR_TYPE = "org.keycloak.services.clientpolicy.executor.ClientPolicyExecutorProvider";
const CONDITION_TYPE = "org.keycloak.services.clientpolicy.condition.ClientPolicyConditionProvider";

const strip = (list: any[]) =>
    (list || []).map((p: any) => {
        const { global, ...rest } = p;
        return rest;
    });

export default function ClientPoliciesEditor({ realm }: { realm: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [profilesDoc, setProfilesDoc] = useState<any>({ profiles: [], globalProfiles: [] });
    const [policiesDoc, setPoliciesDoc] = useState<any>({ policies: [], globalPolicies: [] });
    const [executorTypes, setExecutorTypes] = useState<any[]>([]);
    const [conditionTypes, setConditionTypes] = useState<any[]>([]);

    const [tab, setTab] = useState<"profiles" | "policies">("profiles");
    const [mode, setMode] = useState<"form" | "json">("form");
    const [view, setView] = useState<any>(null);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const [profilesJson, setProfilesJson] = useState("");
    const [policiesJson, setPoliciesJson] = useState("");
    const [jsonErr, setJsonErr] = useState("");
    const [savingJson, setSavingJson] = useState(false);

    const realmRef = useRef(realm);
    realmRef.current = realm;

    useEffect(() => {
        let alive = true;
        const target = realm;
        setStatus("loading");
        setView(null);
        Promise.all([
            adminClient.clientPolicies.listProfiles({ realm: target, includeGlobalProfiles: true }),
            adminClient.clientPolicies.listPolicies({ realm: target, includeGlobalPolicies: true }),
            adminClient.serverInfo.find().catch(() => null)
        ])
            .then(([prof, pol, info]) => {
                if (!alive || realmRef.current !== target) return;
                const p = { profiles: prof?.profiles || [], globalProfiles: prof?.globalProfiles || [] };
                const q = { policies: pol?.policies || [], globalPolicies: pol?.globalPolicies || [] };
                setProfilesDoc(p);
                setPoliciesDoc(q);
                setProfilesJson(JSON.stringify(p, null, 2));
                setPoliciesJson(JSON.stringify(q, null, 2));
                setExecutorTypes(info?.componentTypes?.[EXECUTOR_TYPE] || []);
                setConditionTypes(info?.componentTypes?.[CONDITION_TYPE] || []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [realm, attempt]);

    const applyProfiles = (p: any) => {
        setProfilesDoc(p);
        setProfilesJson(JSON.stringify(p, null, 2));
    };
    const applyPolicies = (q: any) => {
        setPoliciesDoc(q);
        setPoliciesJson(JSON.stringify(q, null, 2));
    };

    const writeProfiles = async (profiles: any[], success: string, failure: string) => {
        const next = { profiles, globalProfiles: profilesDoc.globalProfiles || [] };
        try {
            await adminClient.clientPolicies.createProfiles({ ...next, realm });
            applyProfiles(next);
            addAlert(success, AlertVariant.success);
            return true;
        } catch (err) {
            addError(failure, err);
            return false;
        }
    };

    const writePolicies = async (policies: any[], success: string, failure: string) => {
        const next = { policies: strip(policies), globalPolicies: policiesDoc.globalPolicies || [] };
        try {
            await adminClient.clientPolicies.updatePolicy({ policies: next.policies, realm });
            applyPolicies(next);
            addAlert(success, AlertVariant.success);
            return true;
        } catch (err) {
            addError(failure, err);
            return false;
        }
    };

    const deleteProfile = (p: any) =>
        setConfirmOpts({
            title: t("sxClientPoliciesEditorDeleteProfileTitle"),
            message: t("sxClientPoliciesEditorDeleteProfileMessage", { name: p.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                const ok = await writeProfiles(
                    (profilesDoc.profiles || []).filter((x: any) => x.name !== p.name),
                    t("sxClientPoliciesEditorProfileDeleted"),
                    t("sxClientPoliciesEditorProfileDeleteError")
                );
                if (ok) setView(null);
            }
        });

    const deletePolicy = (p: any) =>
        setConfirmOpts({
            title: t("sxClientPoliciesEditorDeletePolicyTitle"),
            message: t("sxClientPoliciesEditorDeletePolicyMessage", { name: p.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                const ok = await writePolicies(
                    (policiesDoc.policies || []).filter((x: any) => x.name !== p.name),
                    t("sxClientPoliciesEditorPolicyDeleted"),
                    t("sxClientPoliciesEditorPolicyDeleteError")
                );
                if (ok) setView(null);
            }
        });

    const togglePolicy = async (p: any, enabled: boolean) => {
        setBusy(p.name);
        await writePolicies(
            (policiesDoc.policies || []).map((x: any) => (x.name === p.name ? { ...x, enabled } : x)),
            enabled ? t("sxClientPoliciesEditorPolicyEnabled") : t("sxClientPoliciesEditorPolicyDisabled"),
            t("sxClientPoliciesEditorPolicySaveError")
        );
        setBusy(null);
    };

    const saveProfilesJson = async () => {
        let parsed: any;
        try {
            parsed = JSON.parse(profilesJson);
            setJsonErr("");
        } catch (err: any) {
            setJsonErr(t("sxRealmSettingsProfilesInvalidJson", { message: err.message }));
            return;
        }
        setSavingJson(true);
        try {
            await adminClient.clientPolicies.createProfiles({ ...parsed, realm });
            const fresh = await adminClient.clientPolicies
                .listProfiles({ realm, includeGlobalProfiles: true })
                .catch(() => null);
            applyProfiles(
                fresh
                    ? { profiles: fresh.profiles || [], globalProfiles: fresh.globalProfiles || [] }
                    : { profiles: parsed.profiles || [], globalProfiles: parsed.globalProfiles || profilesDoc.globalProfiles || [] }
            );
            addAlert(t("sxRealmSettingsClientProfilesSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingJson(false);
        }
    };

    const savePoliciesJson = async () => {
        let parsed: any;
        try {
            parsed = JSON.parse(policiesJson);
            setJsonErr("");
        } catch (err: any) {
            setJsonErr(t("sxRealmSettingsPoliciesInvalidJson", { message: err.message }));
            return;
        }
        setSavingJson(true);
        try {
            await adminClient.clientPolicies.updatePolicy({ ...parsed, realm });
            const fresh = await adminClient.clientPolicies
                .listPolicies({ realm, includeGlobalPolicies: true })
                .catch(() => null);
            applyPolicies(
                fresh
                    ? { policies: fresh.policies || [], globalPolicies: fresh.globalPolicies || [] }
                    : { policies: parsed.policies || [], globalPolicies: parsed.globalPolicies || policiesDoc.globalPolicies || [] }
            );
            addAlert(t("sxRealmSettingsClientPoliciesSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingJson(false);
        }
    };

    if (status === "loading") return <ListSkeleton rows={4} />;
    if (status === "error") {
        return (
            <Notice
                title={t("sxRealmSettingsClientPoliciesLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );
    }

    const confirmDialog = <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />;

    if (view?.kind === "profile") {
        const realmProfiles = profilesDoc.profiles || [];
        const globalProfile = (profilesDoc.globalProfiles || []).find((p: any) => p.name === view.name);
        const current = globalProfile || realmProfiles.find((p: any) => p.name === view.name);
        return (
            <>
                <CpProfileForm
                    key={view.name ?? "new"}
                    profile={current}
                    isGlobal={!!globalProfile}
                    takenNames={[...realmProfiles, ...(profilesDoc.globalProfiles || [])]
                        .map((p: any) => p.name)
                        .filter((n: string) => n !== view.name)}
                    executorTypes={executorTypes}
                    onBack={() => setView(null)}
                    onDelete={current && !globalProfile ? () => deleteProfile(current) : undefined}
                    onSave={async (next: any) => {
                        const exists = realmProfiles.some((p: any) => p.name === view.name);
                        const list = exists
                            ? realmProfiles.map((p: any) => (p.name === view.name ? next : p))
                            : [...realmProfiles, next];
                        const ok = await writeProfiles(
                            list,
                            exists ? t("sxClientPoliciesEditorProfileUpdated") : t("sxClientPoliciesEditorProfileCreated"),
                            t("sxClientPoliciesEditorProfileSaveError")
                        );
                        if (ok) setView({ kind: "profile", name: next.name });
                        return ok;
                    }}
                />
                {confirmDialog}
            </>
        );
    }

    if (view?.kind === "policy") {
        const realmPolicies = policiesDoc.policies || [];
        const globalPolicy = (policiesDoc.globalPolicies || []).find((p: any) => p.name === view.name);
        const current = globalPolicy || realmPolicies.find((p: any) => p.name === view.name);
        const profileNames = [...(profilesDoc.globalProfiles || []), ...(profilesDoc.profiles || [])]
            .map((p: any) => p.name)
            .filter(Boolean);
        return (
            <>
                <CpPolicyForm
                    key={view.name ?? "new"}
                    policy={current}
                    isGlobal={!!globalPolicy}
                    takenNames={[...realmPolicies, ...(policiesDoc.globalPolicies || [])]
                        .map((p: any) => p.name)
                        .filter((n: string) => n !== view.name)}
                    conditionTypes={conditionTypes}
                    profileNames={profileNames}
                    onBack={() => setView(null)}
                    onDelete={current && !globalPolicy ? () => deletePolicy(current) : undefined}
                    onSave={async (next: any) => {
                        const exists = realmPolicies.some((p: any) => p.name === view.name);
                        const list = exists
                            ? realmPolicies.map((p: any) => (p.name === view.name ? next : p))
                            : [...realmPolicies, next];
                        const ok = await writePolicies(
                            list,
                            exists ? t("sxClientPoliciesEditorPolicyUpdated") : t("sxClientPoliciesEditorPolicyCreated"),
                            t("sxClientPoliciesEditorPolicySaveError")
                        );
                        if (ok) setView({ kind: "policy", name: next.name });
                        return ok;
                    }}
                />
                {confirmDialog}
            </>
        );
    }

    const modeToggle = (
        <TextAction
            onClick={() => {
                setJsonErr("");
                setMode(m => (m === "form" ? "json" : "form"));
            }}
        >
            {mode === "form" ? t("sxClientPoliciesEditorJsonView") : t("sxClientPoliciesEditorFormView")}
        </TextAction>
    );

    const allProfiles = [
        ...(profilesDoc.globalProfiles || []).map((p: any) => ({ ...p, global: true })),
        ...(profilesDoc.profiles || [])
    ];
    const allPolicies = [
        ...(policiesDoc.globalPolicies || []).map((p: any) => ({ ...p, global: true })),
        ...(policiesDoc.policies || [])
    ];

    return (
        <>
            <SegmentTabs
                value={tab}
                onChange={(v: any) => {
                    setTab(v);
                    setJsonErr("");
                }}
                items={[
                    { value: "profiles", label: t("sxRealmSettingsProfiles") },
                    { value: "policies", label: t("sxRealmSettingsPolicies") }
                ]}
                ariaLabel={t("sxRealmSettingsTabClientPolicies")}
            />

            {tab === "profiles" && mode === "form" && (
                <Section
                    label={t("sxRealmSettingsProfiles")}
                    action={
                        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                            {modeToggle}
                            <TextAction onClick={() => setView({ kind: "profile" })}>
                                <AddLabel>{t("sxClientPoliciesEditorCreateProfile")}</AddLabel>
                            </TextAction>
                        </div>
                    }
                >
                    {allProfiles.length === 0 ? (
                        <Notice
                            title={t("sxRealmSettingsNoProfilesTitle")}
                            description={t("sxClientPoliciesEditorNoProfilesDescription")}
                            action={
                                <Button onClick={() => setView({ kind: "profile" })}>
                                    {t("sxClientPoliciesEditorCreateProfile")}
                                </Button>
                            }
                        />
                    ) : (
                        <ul className={GROUP}>
                            {allProfiles.map((p: any, i: number) => (
                                <ItemWrap key={`${p.global ? "g" : "r"}-${p.name}`} first={i === 0}>
                                    <ListRow
                                        title={p.name}
                                        subtitle={[
                                            p.description,
                                            t("sxClientPoliciesEditorExecutorCount", { total: (p.executors || []).length })
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        chips={p.global ? <Chip>{t("sxRealmSettingsGlobal")}</Chip> : undefined}
                                        onOpen={() => setView({ kind: "profile", name: p.name })}
                                        trailing={
                                            p.global ? undefined : (
                                                <TextAction tone="danger" onClick={() => deleteProfile(p)}>
                                                    {t("sxCommonDelete")}
                                                </TextAction>
                                            )
                                        }
                                    />
                                </ItemWrap>
                            ))}
                        </ul>
                    )}
                </Section>
            )}

            {tab === "profiles" && mode === "json" && (
                <>
                    <Section label={t("sxRealmSettingsProfilesJson")} action={modeToggle}>
                        <JsonCard
                            rows={18}
                            value={profilesJson}
                            onChange={setProfilesJson}
                            label={t("sxRealmSettingsProfilesJson")}
                        />
                        {jsonErr && <ErrorNote>{jsonErr}</ErrorNote>}
                    </Section>
                    <SaveBar onClick={saveProfilesJson} saving={savingJson} label={t("sxRealmSettingsSaveProfiles")} />
                </>
            )}

            {tab === "policies" && mode === "form" && (
                <Section
                    label={t("sxRealmSettingsPolicies")}
                    action={
                        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                            {modeToggle}
                            <TextAction onClick={() => setView({ kind: "policy" })}>
                                <AddLabel>{t("sxClientPoliciesEditorCreatePolicy")}</AddLabel>
                            </TextAction>
                        </div>
                    }
                >
                    {allPolicies.length === 0 ? (
                        <Notice
                            title={t("sxRealmSettingsNoPoliciesTitle")}
                            description={t("sxClientPoliciesEditorNoPoliciesDescription")}
                            action={
                                <Button onClick={() => setView({ kind: "policy" })}>
                                    {t("sxClientPoliciesEditorCreatePolicy")}
                                </Button>
                            }
                        />
                    ) : (
                        <ul className={GROUP}>
                            {allPolicies.map((p: any, i: number) => (
                                <ItemWrap key={`${p.global ? "g" : "r"}-${p.name}`} first={i === 0}>
                                    <ListRow
                                        title={p.name}
                                        subtitle={p.description}
                                        chips={p.global ? <Chip>{t("sxRealmSettingsGlobal")}</Chip> : undefined}
                                        onOpen={() => setView({ kind: "policy", name: p.name })}
                                        trailing={
                                            <Switch
                                                checked={p.enabled !== false}
                                                disabled={!!p.global || busy === p.name}
                                                onCheckedChange={(v: boolean) => togglePolicy(p, v)}
                                                aria-label={t("sxClientPoliciesEditorPolicyEnabledLabel", { name: p.name })}
                                            />
                                        }
                                    />
                                </ItemWrap>
                            ))}
                        </ul>
                    )}
                </Section>
            )}

            {tab === "policies" && mode === "json" && (
                <>
                    <Section label={t("sxRealmSettingsPoliciesJson")} action={modeToggle}>
                        <JsonCard
                            rows={18}
                            value={policiesJson}
                            onChange={setPoliciesJson}
                            label={t("sxRealmSettingsPoliciesJson")}
                        />
                        {jsonErr && <ErrorNote>{jsonErr}</ErrorNote>}
                    </Section>
                    <SaveBar onClick={savePoliciesJson} saving={savingJson} label={t("sxRealmSettingsSavePolicies")} />
                </>
            )}

            {confirmDialog}
        </>
    );
}

function ItemWrap({ first, children }: any) {
    return (
        <>
            {!first && <li aria-hidden className={SEPARATOR} />}
            {children}
        </>
    );
}
