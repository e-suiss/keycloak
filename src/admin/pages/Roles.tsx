// @ts-nocheck
import { Button } from "@ui/components/button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { AdminPage, Chip, Group, ListSkeleton, Notice, Row, SearchField, Section } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const BUILT_IN_DESCRIPTIONS: Record<string, string> = {
    "${role_default-roles}": "sxRolesBuiltInDefaultRoles",
    "${role_offline-access}": "sxRolesBuiltInOfflineAccess",
    "${role_uma_authorization}": "sxRolesBuiltInUmaAuthorization"
};

function roleDescription(t: any, description?: string) {
    if (!description) return "—";
    const key = BUILT_IN_DESCRIPTIONS[description];
    if (key) return t(key);
    return /^\$\{.*\}$/.test(description) ? "—" : description;
}

export default function Roles() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [roles, setRoles] = useState<any[]>([]);
    const [filter, setFilter] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.roles
            .find()
            .then(result => {
                if (!alive) return;
                setRoles(result ?? []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const sorted = [...roles].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        if (!q) return sorted;
        return sorted.filter(
            r => (r.name || "").toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)
        );
    }, [roles, filter]);

    const go = (r: any) => navigate(`/${realm}/roles/${encodeURIComponent(r.name)}`);

    return (
        <AdminPage
            title={t("sxNavRealmRoles")}
            description={t("sxRolesDescription")}
            actions={<Button onClick={() => navigate(`/${realm}/roles/new`)}>{t("sxRolesNew")}</Button>}
        >
            <SearchField value={filter} onChange={setFilter} placeholder={t("sxRolesSearch")} />

            <Section label={t("sxRolesSection")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxRolesLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && filtered.length === 0 && roles.length > 0 && (
                    <Notice title={t("sxRolesNoMatchTitle")} description={t("sxRolesNoMatchDescription")} />
                )}
                {status === "ready" && roles.length === 0 && (
                    <Notice
                        title={t("sxRolesEmptyTitle")}
                        description={t("sxRolesEmptyDescription")}
                        action={<Button onClick={() => navigate(`/${realm}/roles/new`)}>{t("sxRolesNew")}</Button>}
                    />
                )}
                {status === "ready" && filtered.length > 0 && (
                    <Group>
                        {filtered.map(r => (
                            <Row
                                key={r.id ?? r.name}
                                onClick={() => go(r)}
                                title={r.name}
                                subtitle={roleDescription(t, r.description)}
                                trailing={
                                    <span className="hidden sm:flex">
                                        <Chip tone={r.composite ? "info" : "neutral"}>
                                            {r.composite ? t("sxRolesComposite") : t("sxRolesSingle")}
                                        </Chip>
                                    </span>
                                }
                            />
                        ))}
                    </Group>
                )}
            </Section>
        </AdminPage>
    );
}
