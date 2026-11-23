// @ts-nocheck
import { useEffect, useState } from "react";
import { Trans } from "react-i18next";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { Group, ListSkeleton, Notice, Section } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { useRealm } from "../../ui/realm";
import { ConfirmDialog, SwitchRow } from "./shared";

export function IdpPermissionsTab({ alias }: { alias: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [state, setState] = useState<any>({ status: "loading", perm: null });
    const [attempt, setAttempt] = useState(0);
    const [saving, setSaving] = useState(false);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);

    useEffect(() => {
        let alive = true;
        setState({ status: "loading", perm: null });
        adminClient.identityProviders
            .listPermissions({ alias })
            .then((perm: any) => alive && setState({ status: "ready", perm: perm ?? {} }))
            .catch(() => alive && setState({ status: "error", perm: null }));
        return () => {
            alive = false;
        };
    }, [adminClient, alias, attempt]);

    const apply = async (enabled: boolean) => {
        setSaving(true);
        try {
            const perm = await adminClient.identityProviders.updatePermission({ alias }, { enabled });
            setState({ status: "ready", perm: perm ?? { enabled } });
            addAlert(
                enabled ? t("sxClientDetailPermsEnabled") : t("sxClientDetailPermsDisabled"),
                AlertVariant.success
            );
        } catch (e) {
            addError(t("sxClientDetailPermsUpdateFailed"), e);
        } finally {
            setSaving(false);
        }
    };

    const toggle = (enabled: boolean) => {
        if (enabled) {
            apply(true);
            return;
        }
        setConfirmOpts({
            title: t("sxIdpDetailPermsDisableTitle"),
            message: t("sxIdpDetailPermsDisableMessage"),
            confirmLabel: t("sxCommonDisable"),
            danger: true,
            onConfirm: () => apply(false)
        });
    };

    if (state.status === "loading") return <ListSkeleton rows={2} />;
    if (state.status === "error")
        return (
            <Notice
                title={t("sxClientDetailPermsLoadErrorTitle")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );

    const perm = state.perm || {};
    const scopes = Object.entries(perm.scopePermissions || {}).sort(([a]: any, [b]: any) =>
        String(a).localeCompare(String(b))
    );

    return (
        <>
            <Section label={t("sxIdpDetailTabPermissions")}>
                <Group>
                    <SwitchRow
                        label={t("sxClientDetailPermsToggle")}
                        hint={t("sxIdpDetailPermsHint")}
                        checked={!!perm.enabled}
                        disabled={saving}
                        onChange={toggle}
                    />
                </Group>
            </Section>
            {perm.enabled && scopes.length > 0 && (
                <Section label={t("sxClientDetailScopePermissions")}>
                    <Group>
                        {scopes.map(([scope, id]: any) => (
                            <li
                                key={scope}
                                className="flex min-h-12 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                            >
                                <span className="text-[15px] font-medium">{scope}</span>
                                <code className="min-w-0 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                    {String(id)}
                                </code>
                            </li>
                        ))}
                    </Group>
                    <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                        <Trans
                            i18nKey="sxClientDetailScopePermissionsFooter"
                            values={{ client: realm === "master" ? "master-realm" : "realm-management" }}
                            components={{ mono: <span className="font-mono" /> }}
                        />
                    </p>
                </Section>
            )}
            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </>
    );
}
