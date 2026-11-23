// @ts-nocheck

import { KeyIcon } from "@phosphor-icons/react";
import { Switch } from "@ui/components/switch";
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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useCapabilities } from "../../ui/capabilities";
import { Group, ListSkeleton, Notice, Row, Section } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { useRealm } from "../../ui/realm";

const SCOPE_HINTS = {
    groups: {
        view: "sxGroupDetailPermScopeView",
        manage: "sxGroupDetailPermScopeManage",
        "view-members": "sxGroupDetailPermScopeViewMembers",
        "manage-members": "sxGroupDetailPermScopeManageMembers",
        "manage-membership": "sxGroupDetailPermScopeManageMembership"
    },
    roles: {
        "map-role": "sxRoleDetailPermScopeMapRole",
        "map-role-client-scope": "sxRoleDetailPermScopeMapRoleClientScope",
        "map-role-composite": "sxRoleDetailPermScopeMapRoleComposite"
    }
};

export function useFineGrainedV1() {
    const caps = useCapabilities();
    return (
        caps.ready &&
        caps.isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ") &&
        !caps.isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ_V2")
    );
}

export function managementClientId(realm: string) {
    return realm === "master" ? "master-realm" : "realm-management";
}

export function PermissionsPanel({ type, id }: { type: "groups" | "roles"; id: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [permission, setPermission] = useState<any>(null);
    const [mgmtId, setMgmtId] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const resource = type === "groups" ? adminClient.groups : adminClient.roles;
    const mgmtClient = managementClientId(realm);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        Promise.all([
            adminClient.clients.find({ clientId: mgmtClient }),
            (type === "groups" ? adminClient.groups : adminClient.roles).listPermissions({ id })
        ])
            .then(([clients, perm]) => {
                if (!alive) return;
                setMgmtId(clients?.[0]?.id ?? "");
                setPermission(perm ?? { enabled: false });
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, type, id, mgmtClient, attempt]);

    const apply = async (enabled: boolean) => {
        setSaving(true);
        try {
            const next = await resource.updatePermission({ id }, { enabled });
            setPermission(next ?? { ...permission, enabled });
            addAlert(
                enabled ? t("sxGroupDetailPermEnabled") : t("sxGroupDetailPermDisabled"),
                AlertVariant.success
            );
        } catch (e) {
            addError(t("sxGroupDetailPermUpdateError"), e);
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading") return <ListSkeleton rows={2} />;
    if (status === "error")
        return (
            <Notice
                title={t("sxGroupDetailPermLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );

    const enabled = !!permission?.enabled;
    const hints = SCOPE_HINTS[type] || {};
    const entries = Object.entries(permission?.scopePermissions || {}).sort(([a], [b]) =>
        String(a).localeCompare(String(b))
    );
    const openAuthz = mgmtId ? () => navigate(`/${realm}/clients/${mgmtId}/authz`) : undefined;

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxGroupDetailPermTitle")}>
                <div className="rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] dark:border-[#38383a] dark:bg-[#1c1c1e]">
                    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                            <div className="text-[15px] font-medium">{t("sxGroupDetailPermToggle")}</div>
                            <div className="mt-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                                {type === "groups" ? t("sxGroupDetailPermHintGroups") : t("sxRoleDetailPermHintRoles")}
                            </div>
                        </div>
                        <Switch
                            checked={enabled}
                            disabled={saving}
                            aria-label={t("sxGroupDetailPermToggle")}
                            onCheckedChange={(v: boolean) => (v ? apply(true) : setConfirmOpen(true))}
                            className="shrink-0"
                        />
                    </div>
                </div>
            </Section>

            {enabled && (
                <Section label={t("sxGroupDetailPermList")}>
                    {entries.length === 0 ? (
                        <Notice
                            title={t("sxGroupDetailPermEmptyTitle")}
                            description={t("sxGroupDetailPermEmptyDescription")}
                        />
                    ) : (
                        <Group>
                            {entries.map(([name, permId]: any) => (
                                <Row
                                    key={permId}
                                    onClick={openAuthz}
                                    leading={
                                        <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e] [&_svg]:size-4.5">
                                            <KeyIcon />
                                        </span>
                                    }
                                    title={name}
                                    subtitle={hints[name] ? t(hints[name]) : <span className="font-mono">{String(permId)}</span>}
                                />
                            ))}
                        </Group>
                    )}
                    <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                        {t("sxGroupDetailPermFooter", { client: mgmtClient })}
                    </p>
                </Section>
            )}

            <Confirm open={confirmOpen} onOpenChange={o => !o && setConfirmOpen(false)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{t("sxGroupDetailPermDisableTitle")}</ConfirmTitle>
                        <ConfirmDescription>{t("sxGroupDetailPermDisableMessage")}</ConfirmDescription>
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxGroupDetailCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant="destructive"
                            onClick={() => {
                                setConfirmOpen(false);
                                apply(false);
                            }}
                        >
                            {t("sxGroupDetailPermDisable")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </div>
    );
}
