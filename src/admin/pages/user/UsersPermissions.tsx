// @ts-nocheck

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Group, ListSkeleton, Notice, Row, Section } from "../../ui/kit";
import { useRealm } from "../../ui/realm";
import { SwitchRow, useConfirm } from "./shared";

export function UsersPermissions() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [perm, setPerm] = useState<any>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        Promise.all([
            adminClient.realms.getUsersManagementPermissions({ realm }),
            adminClient.clients
                .find({ clientId: realm === "master" ? "master-realm" : "realm-management" })
                .catch(() => [])
        ])
            .then(([p, clients]: any) => {
                if (!alive) return;
                setPerm(p || {});
                setClientId(Array.isArray(clients) && clients[0] ? clients[0].id : null);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const toggle = async (enabled: boolean) => {
        setSaving(true);
        try {
            const p = await adminClient.realms.updateUsersManagementPermissions({ realm, enabled });
            setPerm(p || { enabled });
            addAlert(
                enabled ? t("sxUsersXPermissionsEnabled") : t("sxUsersXPermissionsDisabled"),
                AlertVariant.success
            );
        } catch (e) {
            addError(t("sxCommonUpdateError"), e);
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading") return <ListSkeleton />;
    if (status === "error")
        return (
            <Notice
                title={t("sxUsersXPermissionsLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );

    const scopes = Object.entries(perm?.scopePermissions || {});

    return (
        <>
            <Section label={t("sxUsersXPermissions")}>
                <Group>
                    <SwitchRow
                        label={t("sxUsersXPermissionsToggle")}
                        hint={t("sxUsersXPermissionsToggleHint")}
                        checked={!!perm?.enabled}
                        disabled={saving}
                        onChange={(v: boolean) =>
                            v
                                ? toggle(true)
                                : confirm({
                                      title: t("sxUsersXPermissionsToggle"),
                                      message: t("sxUsersXDisablePermissionsConfirm"),
                                      confirmLabel: t("sxCommonDisable"),
                                      danger: true,
                                      onConfirm: () => toggle(false)
                                  })
                        }
                    />
                </Group>
            </Section>
            {perm?.enabled && (
                <Section label={t("sxUsersXPermissionsList")}>
                    {scopes.length === 0 ? (
                        <Notice title={t("sxUsersXNoScopePermissions")} description={t("sxUsersXNoScopePermissionsDescription")} />
                    ) : (
                        <Group>
                            {scopes.map(([scope, id]: any) => (
                                <Row
                                    key={scope}
                                    title={scope}
                                    subtitle={t(`scopePermissions.users.${scope}-description`, { defaultValue: String(id) })}
                                    onClick={clientId ? () => navigate(`/${realm}/clients/${clientId}/authz`) : undefined}
                                />
                            ))}
                        </Group>
                    )}
                </Section>
            )}
            {confirmNode}
        </>
    );
}
