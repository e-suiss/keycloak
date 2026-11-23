// @ts-nocheck

import { Button } from "@ui/components/button";
import { Fragment, useEffect, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, GROUP, ListSkeleton, Notice, Section, SegmentTabs, SEPARATOR, TextAction } from "../../ui/kit";
import { AddLabel, ConfirmDialog, ErrorNote, FormCard, JsonCard, ListRow, MoveButtons, SaveBar, SelectField, tr } from "./cp-ui";
import UpAttributeForm, { USERNAME_EMAIL } from "./up-attribute-form";
import UpGroupForm from "./up-group-form";

const VALIDATOR_TYPE = "org.keycloak.validate.Validator";

const POLICIES = [
    { value: "DISABLED", label: "sxUserProfileEditorPolicyDisabled", hint: "sxUserProfileEditorPolicyDisabledHint" },
    { value: "ENABLED", label: "sxUserProfileEditorPolicyEnabled", hint: "sxUserProfileEditorPolicyEnabledHint" },
    { value: "ADMIN_VIEW", label: "sxUserProfileEditorPolicyAdminView", hint: "sxUserProfileEditorPolicyAdminViewHint" },
    { value: "ADMIN_EDIT", label: "sxUserProfileEditorPolicyAdminEdit", hint: "sxUserProfileEditorPolicyAdminEditHint" }
];

export default function UserProfileEditor({ realm }: { realm: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [config, setConfig] = useState<any>(null);
    const [validatorTypes, setValidatorTypes] = useState<any[]>([]);
    const [clientScopes, setClientScopes] = useState<any[]>([]);

    const [tab, setTab] = useState<"attributes" | "groups" | "unmanaged" | "json">("attributes");
    const [view, setView] = useState<any>(null);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const [moving, setMoving] = useState(false);

    const [policy, setPolicy] = useState("DISABLED");
    const [savingPolicy, setSavingPolicy] = useState(false);

    const [json, setJson] = useState("");
    const [jsonErr, setJsonErr] = useState("");
    const [savingJson, setSavingJson] = useState(false);

    const realmRef = useRef(realm);
    realmRef.current = realm;

    const apply = (next: any) => {
        setConfig(next);
        setJson(JSON.stringify(next, null, 2));
        setPolicy(next?.unmanagedAttributePolicy || "DISABLED");
    };

    useEffect(() => {
        let alive = true;
        const target = realm;
        setStatus("loading");
        setView(null);
        Promise.all([
            adminClient.users.getProfile({ realm: target }),
            adminClient.serverInfo.find().catch(() => null),
            adminClient.clientScopes.find({ realm: target }).catch(() => [])
        ])
            .then(([profile, info, scopes]) => {
                if (!alive || realmRef.current !== target) return;
                apply(profile || {});
                setValidatorTypes(info?.componentTypes?.[VALIDATOR_TYPE] || []);
                setClientScopes(Array.isArray(scopes) ? scopes : []);
                setJsonErr("");
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [realm, attempt]);

    const write = async (next: any, success: string, failure = t("sxRealmSettingsSaveError")) => {
        try {
            const updated = await adminClient.users.updateProfile({ ...next, realm });
            apply(updated && typeof updated === "object" && updated.attributes ? updated : next);
            addAlert(success, AlertVariant.success);
            return true;
        } catch (err) {
            addError(failure, err);
            return false;
        }
    };

    const attributes = config?.attributes || [];
    const groups = config?.groups || [];

    const move = async (index: number, delta: number) => {
        const target = index + delta;
        if (target < 0 || target >= attributes.length) return;
        const list = [...attributes];
        const [item] = list.splice(index, 1);
        list.splice(target, 0, item);
        setMoving(true);
        await write({ ...config, attributes: list }, t("sxUserProfileEditorOrderSaved"));
        setMoving(false);
    };

    const deleteAttribute = (a: any) =>
        setConfirmOpts({
            title: t("sxUserProfileEditorDeleteAttributeTitle"),
            message: t("sxUserProfileEditorDeleteAttributeMessage", { name: a.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                const ok = await write(
                    { ...config, attributes: attributes.filter((x: any) => x.name !== a.name) },
                    t("sxUserProfileEditorAttributeDeleted"),
                    t("sxUserProfileEditorAttributeDeleteError")
                );
                if (ok) setView(null);
            }
        });

    const deleteGroup = (g: any) =>
        setConfirmOpts({
            title: t("sxUserProfileEditorDeleteGroupTitle"),
            message: t("sxUserProfileEditorDeleteGroupMessage", { name: g.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                const ok = await write(
                    {
                        ...config,
                        groups: groups.filter((x: any) => x.name !== g.name),
                        attributes: attributes.map((a: any) => {
                            if (a.group !== g.name) return a;
                            const { group, ...rest } = a;
                            return rest;
                        })
                    },
                    t("sxUserProfileEditorGroupDeleted"),
                    t("sxUserProfileEditorGroupDeleteError")
                );
                if (ok) setView(null);
            }
        });

    const savePolicy = async () => {
        const next = { ...config };
        if (policy === "DISABLED") delete next.unmanagedAttributePolicy;
        else next.unmanagedAttributePolicy = policy;
        setSavingPolicy(true);
        await write(next, t("sxUserProfileEditorPolicySaved"));
        setSavingPolicy(false);
    };

    const saveJson = async () => {
        let parsed: any;
        try {
            parsed = JSON.parse(json);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(t("sxUserProfileEditorJsonNotObject"));
            setJsonErr("");
        } catch (err: any) {
            setJsonErr(t("sxRealmSettingsInvalidJson", { message: err.message }));
            return;
        }
        setSavingJson(true);
        await write(parsed, t("sxRealmSettingsUserProfileSaved"));
        setSavingJson(false);
    };

    if (status === "loading") return <ListSkeleton rows={4} />;
    if (status === "error") {
        return (
            <Notice
                title={t("sxRealmSettingsUserProfileLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );
    }

    const confirmDialog = <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />;

    if (view?.kind === "attribute") {
        const current = attributes.find((a: any) => a.name === view.name);
        return (
            <>
                <UpAttributeForm
                    key={view.name ?? "new"}
                    attribute={current}
                    config={config}
                    takenNames={attributes.map((a: any) => a.name)}
                    clientScopes={clientScopes}
                    validatorTypes={validatorTypes}
                    onBack={() => setView(null)}
                    onDelete={current && !USERNAME_EMAIL.includes(current.name) ? () => deleteAttribute(current) : undefined}
                    onSave={async (next: any) => {
                        const list = current
                            ? attributes.map((a: any) => (a.name === current.name ? next : a))
                            : [...attributes, next];
                        const ok = await write(
                            { ...config, attributes: list },
                            current ? t("sxUserProfileEditorAttributeUpdated") : t("sxUserProfileEditorAttributeCreated"),
                            t("sxUserProfileEditorAttributeSaveError")
                        );
                        if (ok) setView(null);
                    }}
                />
                {confirmDialog}
            </>
        );
    }

    if (view?.kind === "group") {
        const current = groups.find((g: any) => g.name === view.name);
        return (
            <>
                <UpGroupForm
                    key={view.name ?? "new"}
                    group={current}
                    takenNames={groups.map((g: any) => g.name)}
                    onBack={() => setView(null)}
                    onDelete={current ? () => deleteGroup(current) : undefined}
                    onSave={async (next: any) => {
                        const list = current ? groups.map((g: any) => (g.name === current.name ? next : g)) : [...groups, next];
                        const ok = await write(
                            { ...config, groups: list },
                            current ? t("sxUserProfileEditorGroupUpdated") : t("sxUserProfileEditorGroupCreated"),
                            t("sxUserProfileEditorGroupSaveError")
                        );
                        if (ok) setView(null);
                    }}
                />
                {confirmDialog}
            </>
        );
    }

    const selectedPolicy = POLICIES.find(p => p.value === policy);

    return (
        <>
            <SegmentTabs
                value={tab}
                onChange={(v: any) => {
                    setTab(v);
                    setJsonErr("");
                }}
                items={[
                    { value: "attributes", label: t("sxRealmSettingsAttributes") },
                    { value: "groups", label: t("sxUserProfileEditorTabGroups") },
                    { value: "unmanaged", label: t("sxUserProfileEditorTabUnmanaged") },
                    { value: "json", label: t("sxUserProfileEditorTabJson") }
                ]}
                ariaLabel={t("sxRealmSettingsTabUserProfile")}
            />

            {tab === "attributes" && (
                <Section
                    label={t("sxRealmSettingsAttributes")}
                    action={
                        <TextAction onClick={() => setView({ kind: "attribute" })}>
                            <AddLabel>{t("sxUserProfileEditorCreateAttribute")}</AddLabel>
                        </TextAction>
                    }
                >
                    {attributes.length === 0 ? (
                        <Notice
                            title={t("sxRealmSettingsNoAttributesTitle")}
                            description={t("sxUserProfileEditorNoAttributesDescription")}
                            action={
                                <Button onClick={() => setView({ kind: "attribute" })}>
                                    {t("sxUserProfileEditorCreateAttribute")}
                                </Button>
                            }
                        />
                    ) : (
                        <ul className={GROUP} aria-busy={moving || undefined}>
                            {attributes.map((a: any, i: number) => (
                                <Fragment key={a.name}>
                                    {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                    <ListRow
                                        title={tr(t, a.displayName) || a.name}
                                        subtitle={[
                                            a.name,
                                            a.group ? t("sxUserProfileEditorInGroup", { group: a.group }) : null,
                                            a.multivalued ? t("sxUserProfileEditorMultivalued") : null
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        chips={a.required ? <Chip tone="info">{t("sxRealmSettingsRequired")}</Chip> : undefined}
                                        onOpen={() => setView({ kind: "attribute", name: a.name })}
                                        trailing={
                                            <MoveButtons
                                                disabled={moving}
                                                onUp={i > 0 ? () => move(i, -1) : undefined}
                                                onDown={i < attributes.length - 1 ? () => move(i, 1) : undefined}
                                            />
                                        }
                                    />
                                </Fragment>
                            ))}
                        </ul>
                    )}
                </Section>
            )}

            {tab === "groups" && (
                <Section
                    label={t("sxUserProfileEditorTabGroups")}
                    action={
                        <TextAction onClick={() => setView({ kind: "group" })}>
                            <AddLabel>{t("sxUserProfileEditorCreateGroup")}</AddLabel>
                        </TextAction>
                    }
                >
                    {groups.length === 0 ? (
                        <Notice
                            title={t("sxUserProfileEditorNoGroupsTitle")}
                            description={t("sxUserProfileEditorNoGroupsDescription")}
                            action={<Button onClick={() => setView({ kind: "group" })}>{t("sxUserProfileEditorCreateGroup")}</Button>}
                        />
                    ) : (
                        <ul className={GROUP}>
                            {groups.map((g: any, i: number) => (
                                <Fragment key={g.name}>
                                    {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                    <ListRow
                                        title={g.name}
                                        subtitle={[tr(t, g.displayHeader), tr(t, g.displayDescription)].filter(Boolean).join(" · ") || undefined}
                                        onOpen={() => setView({ kind: "group", name: g.name })}
                                        trailing={
                                            <TextAction tone="danger" onClick={() => deleteGroup(g)}>
                                                {t("sxCommonDelete")}
                                            </TextAction>
                                        }
                                    />
                                </Fragment>
                            ))}
                        </ul>
                    )}
                </Section>
            )}

            {tab === "unmanaged" && (
                <>
                    <Section label={t("sxUserProfileEditorTabUnmanaged")}>
                        <FormCard>
                            <SelectField
                                label={t("sxUserProfileEditorUnmanagedLabel")}
                                hint={selectedPolicy ? t(selectedPolicy.hint) : undefined}
                                value={policy}
                                onChange={setPolicy}
                                options={POLICIES.map(p => ({ value: p.value, label: t(p.label) }))}
                            />
                        </FormCard>
                    </Section>
                    <SaveBar
                        onClick={savePolicy}
                        saving={savingPolicy}
                        disabled={policy === (config?.unmanagedAttributePolicy || "DISABLED")}
                    />
                </>
            )}

            {tab === "json" && (
                <>
                    <Section label={t("sxRealmSettingsRawConfig")}>
                        <JsonCard rows={22} value={json} onChange={setJson} label={t("sxRealmSettingsRawConfig")} />
                        {jsonErr && <ErrorNote>{jsonErr}</ErrorNote>}
                    </Section>
                    <SaveBar onClick={saveJson} saving={savingJson} />
                </>
            )}

            {confirmDialog}
        </>
    );
}
