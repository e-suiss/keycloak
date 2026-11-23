// @ts-nocheck
import { Button } from "@ui/components/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import { AdminPage, Chip, Group, ListSkeleton, Notice, Pager, Row, SearchField, Section } from "../ui/kit";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const PAGE_SIZE = 20;

export default function Users() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [users, setUsers] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const id = setTimeout(() => {
            setFirst(0);
            setSearch(query.trim());
        }, 300);
        return () => clearTimeout(id);
    }, [query]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.users
            .find({ first, max: PAGE_SIZE, search: search || undefined })
            .then(result => {
                if (!alive) return;
                setUsers(Array.isArray(result) ? result : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, first, search, attempt]);

    const page = Math.floor(first / PAGE_SIZE) + 1;

    return (
        <AdminPage
            title={t("sxUsersTitle")}
            description={t("sxUsersDescription")}
            actions={<Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate(`/${realm}/users/new`)}>{t("sxUsersNew")}</Button>}
        >
            <SearchField value={query} onChange={setQuery} placeholder={t("sxUsersSearchPlaceholder")} />

            <Section label={t("sxUsersTitle")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxUsersLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && users.length === 0 && (
                    <Notice
                        title={search ? t("sxUsersNoMatch") : t("sxUsersEmpty")}
                        description={search ? t("sxUsersNoMatchDescription") : t("sxUsersEmptyDescription")}
                        action={search ? undefined : <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate(`/${realm}/users/new`)}>{t("sxUsersNew")}</Button>}
                    />
                )}
                {status === "ready" && users.length > 0 && (
                    <Group>
                        {users.map(user => {
                            const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
                            return (
                                <Row
                                    key={user.id}
                                    testId={`user-${user.username}`}
                                    onClick={() => navigate(`/${realm}/users/${user.id}`)}
                                    leading={
                                        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
                                            {initials(fullName || user.username)}
                                        </span>
                                    }
                                    title={user.username}
                                    subtitle={[fullName, user.email].filter(Boolean).join(" · ") || "—"}
                                    trailing={
                                        <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                                            {user.email && !user.emailVerified && (
                                                <Chip tone="warning">{t("sxUsersEmailUnverified")}</Chip>
                                            )}
                                            <Chip tone={user.enabled ? "success" : "danger"}>
                                                {user.enabled ? t("sxCommonEnabled") : t("sxCommonDisabled")}
                                            </Chip>
                                        </span>
                                    }
                                />
                            );
                        })}
                    </Group>
                )}
                {status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={page}
                            hasPrev={first > 0}
                            hasNext={users.length >= PAGE_SIZE}
                            onPrev={() => setFirst(f => Math.max(0, f - PAGE_SIZE))}
                            onNext={() => setFirst(f => f + PAGE_SIZE)}
                        />
                    </div>
                )}
            </Section>
        </AdminPage>
    );
}
