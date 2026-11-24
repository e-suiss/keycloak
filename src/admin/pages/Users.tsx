// @ts-nocheck
import { FunnelIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { fetchAdminUI } from "../context/auth/admin-ui-endpoint";
import { useCapabilities } from "../ui/capabilities";
import { useT } from "../ui/i18n";
import {
    AdminPage,
    Chip,
    GROUP,
    Group,
    ListSkeleton,
    Notice,
    Pager,
    Row,
    SEPARATOR,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";
import { labelOf } from "./user/profile";
import { SwitchRow, useConfirm } from "./user/shared";
import { UsersPermissions } from "./user/UsersPermissions";
import { GrainAvatar } from "../../shared/brand";

const PAGE_SIZE = 20;

const quote = (v: string) => (/\s/.test(v) ? `"${v.replace(/"/g, "")}"` : v);
const toQuery = (filters: { key: string; value: string }[]) =>
    filters.map(f => `${quote(f.key)}:${quote(f.value)}`).join(" ");

function Avatar({ name }: { name: string }) {
    return (
        <GrainAvatar seed={name} className="size-8 text-[11px]">
            {initials(name)}
        </GrainAvatar>
    );
}

export default function Users() {
    const { realm } = useRealm();
    const { ready, realmRep, isFeatureEnabled } = useCapabilities();
    const [tab, setTab] = useState("list");
    const canViewPermissions =
        ready && isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ") && !isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ_V2");

    return (
        <UsersPage
            key={realm}
            tab={canViewPermissions ? tab : "list"}
            setTab={setTab}
            canViewPermissions={canViewPermissions}
            bruteForceProtected={!!realmRep?.bruteForceProtected}
        />
    );
}

function UsersPage({ tab, setTab, canViewPermissions, bruteForceProtected }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [users, setUsers] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [filters, setFilters] = useState<{ key: string; value: string }[]>([]);
    const [exact, setExact] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [draft, setDraft] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
    const [draftExact, setDraftExact] = useState(false);
    const [profileAttrs, setProfileAttrs] = useState<any[]>([]);
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const q = toQuery(filters);

    useEffect(() => {
        const id = setTimeout(() => {
            setFirst(0);
            setSearch(query.trim());
        }, 300);
        return () => clearTimeout(id);
    }, [query]);

    useEffect(() => {
        let alive = true;
        adminClient.users
            .getProfile()
            .then((p: any) => alive && setProfileAttrs(Array.isArray(p?.attributes) ? p.attributes : []))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [adminClient, realm]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        const params: Record<string, string> = {
            first: String(first),
            max: String(PAGE_SIZE),
            briefRepresentation: "true"
        };
        if (search) params.search = search;
        if (q) params.q = q;
        if (exact && (search || q)) params.exact = "true";
        fetchAdminUI(adminClient, "ui-ext/brute-force-user", params)
            .catch(() =>
                adminClient.users.find({
                    first,
                    max: PAGE_SIZE,
                    search: search || undefined,
                    q: q || undefined,
                    exact: exact && (search || q) ? true : undefined,
                    briefRepresentation: true
                })
            )
            .then((result: any) => {
                if (!alive) return;
                setUsers(Array.isArray(result) ? result : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, first, search, q, exact, attempt]);

    const page = Math.floor(first / PAGE_SIZE) + 1;
    const filtering = !!search || filters.length > 0;

    const openFilters = () => {
        setDraft(filters.length ? filters.map(f => ({ ...f })) : [{ key: "", value: "" }]);
        setDraftExact(exact);
        setShowFilters(s => !s);
    };
    const applyFilters = () => {
        const clean = draft.map(f => ({ key: f.key.trim(), value: f.value.trim() })).filter(f => f.key && f.value);
        setFirst(0);
        setFilters(clean);
        setExact(draftExact);
        setShowFilters(false);
    };
    const clearFilters = () => {
        setFirst(0);
        setFilters([]);
        setExact(false);
        setDraft([{ key: "", value: "" }]);
        setDraftExact(false);
    };
    const removeFilter = (index: number) => {
        setFirst(0);
        setFilters(list => list.filter((_, i) => i !== index));
    };

    const toggleSelected = (id: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const stopSelecting = () => {
        setSelecting(false);
        setSelected(new Set());
    };

    const deleteSelected = () => {
        const chosen = users.filter(u => selected.has(u.id));
        if (!chosen.length) return;
        confirm({
            title: t("sxUsersXDeleteSelectedTitle"),
            message: t("sxUsersXDeleteSelectedConfirm", { total: chosen.length }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                const results = await Promise.allSettled(chosen.map(u => adminClient.users.del({ id: u.id })));
                const failed = results.filter(r => r.status === "rejected");
                if (failed.length) addError(t("sxUsersXDeleteSomeFailed", { total: failed.length }), failed[0].reason);
                if (failed.length < chosen.length)
                    addAlert(t("sxUsersXDeleted", { total: chosen.length - failed.length }), AlertVariant.success);
                stopSelecting();
                setAttempt(n => n + 1);
            }
        });
    };

    const unlockAll = () =>
        confirm({
            title: t("sxUsersXUnlockAll"),
            message: t("sxUsersXUnlockAllConfirm"),
            confirmLabel: t("sxUsersXUnlock"),
            onConfirm: async () => {
                try {
                    await adminClient.attackDetection.delAll();
                    addAlert(t("sxUsersXUnlockedAll"), AlertVariant.success);
                    setAttempt(n => n + 1);
                } catch (e) {
                    addError(t("sxUsersXUnlockError"), e);
                }
            }
        });

    const activeDraft = draft.filter(f => f.key.trim() && f.value.trim()).length;

    return (
        <AdminPage
            title={t("sxUsersTitle")}
            description={t("sxUsersDescription")}
            actions={
                <>
                    {bruteForceProtected && tab === "list" && (
                        <Button variant="secondary" onClick={unlockAll}>
                            {t("sxUsersXUnlockAll")}
                        </Button>
                    )}
                    <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate(`/${realm}/users/new`)}>
                        {t("sxUsersNew")}
                    </Button>
                </>
            }
        >
            {canViewPermissions && (
                <SegmentTabs
                    ariaLabel={t("sxUsersTitle")}
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "list", label: t("sxUsersXUserList") },
                        { value: "permissions", label: t("sxUsersXPermissions") }
                    ]}
                />
            )}

            {tab === "permissions" && <UsersPermissions />}

            {tab === "list" && (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <SearchField value={query} onChange={setQuery} placeholder={t("sxUsersSearchPlaceholder")} />
                        <Button
                            type="button"
                            variant={showFilters || filters.length > 0 ? "tinted" : "secondary"}
                            className="h-11 shrink-0 self-start sm:self-auto"
                            onClick={openFilters}
                        >
                            <FunnelIcon data-icon="inline-start" weight={filters.length > 0 ? "fill" : "regular"} />
                            {filters.length > 0
                                ? t("sxUsersXAttributeSearchCount", { total: filters.length })
                                : t("sxUsersXAttributeSearch")}
                        </Button>
                    </div>

                    {showFilters && (
                        <Section label={t("sxUsersXAttributeSearch")}>
                            <div className={`${GROUP} p-4`}>
                                <div className="flex flex-col gap-4">
                                    {draft.map((f, i) => (
                                        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                                            <Field size="lg" className="sm:flex-1">
                                                <FieldLabel htmlFor={`attr-key-${i}`}>{t("sxCommonKey")}</FieldLabel>
                                                <Input
                                                    size="lg"
                                                    id={`attr-key-${i}`}
                                                    list="users-attribute-names"
                                                    value={f.key}
                                                    placeholder={t("sxCommonKeyPlaceholder")}
                                                    onChange={(e: any) =>
                                                        setDraft(d => d.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))
                                                    }
                                                />
                                            </Field>
                                            <Field size="lg" className="sm:flex-1">
                                                <FieldLabel htmlFor={`attr-value-${i}`}>{t("sxCommonValue")}</FieldLabel>
                                                <Input
                                                    size="lg"
                                                    id={`attr-value-${i}`}
                                                    value={f.value}
                                                    onChange={(e: any) =>
                                                        setDraft(d => d.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
                                                    }
                                                    onKeyDown={(e: any) => e.key === "Enter" && applyFilters()}
                                                />
                                            </Field>
                                            {draft.length > 1 && (
                                                <TextAction
                                                    tone="danger"
                                                    className="self-end sm:mb-4"
                                                    onClick={() => setDraft(d => d.filter((_, idx) => idx !== i))}
                                                >
                                                    {t("sxCommonRemove")}
                                                </TextAction>
                                            )}
                                        </div>
                                    ))}
                                    <datalist id="users-attribute-names">
                                        {profileAttrs.map((a: any) => (
                                            <option key={a.name} value={a.name}>
                                                {labelOf(t, a.displayName, a.name)}
                                            </option>
                                        ))}
                                    </datalist>
                                    <div>
                                        <Button
                                            type="button"
                                            variant="plain"
                                            size="sm"
                                            onClick={() => setDraft(d => [...d, { key: "", value: "" }])}
                                        >
                                            {t("sxUsersXAddCondition")}
                                        </Button>
                                    </div>
                                    <Group>
                                        <SwitchRow label={t("sxUsersXExactSearch")} checked={draftExact} onChange={setDraftExact} />
                                    </Group>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Button type="button" disabled={activeDraft === 0 && filters.length === 0} onClick={applyFilters}>
                                        {t("sxEventsApplyFilters")}
                                    </Button>
                                    {filters.length > 0 && (
                                        <Button type="button" variant="plain" onClick={clearFilters}>
                                            <XIcon data-icon="inline-start" /> {t("sxEventsClearFilters")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Section>
                    )}

                    {filters.length > 0 && !showFilters && (
                        <div className="flex flex-wrap items-center gap-2">
                            {filters.map((f, i) => (
                                <button
                                    key={`${f.key}-${i}`}
                                    type="button"
                                    onClick={() => removeFilter(i)}
                                    aria-label={t("sxUsersXRemoveCondition", { condition: `${f.key}: ${f.value}` })}
                                    className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-[#d2d2d7] px-3 text-[13px] font-medium outline-none hover:bg-black/3 focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-[#48484a] dark:hover:bg-white/4"
                                >
                                    <span className="truncate">{`${f.key}: ${f.value}`}</span>
                                    <XIcon className="size-3 shrink-0 text-muted-foreground" />
                                </button>
                            ))}
                            {exact && <Chip tone="info">{t("sxUsersXExactSearch")}</Chip>}
                        </div>
                    )}

                    <Section
                        label={selecting ? t("sxUsersXSelectedCount", { total: selected.size }) : t("sxUsersTitle")}
                        action={
                            status === "ready" &&
                            users.length > 0 &&
                            (selecting ? (
                                <span className="flex items-center gap-4">
                                    <TextAction tone="danger" disabled={selected.size === 0} onClick={deleteSelected}>
                                        {t("sxCommonDelete")}
                                    </TextAction>
                                    <TextAction onClick={stopSelecting}>{t("sxUsersXDone")}</TextAction>
                                </span>
                            ) : (
                                <TextAction onClick={() => setSelecting(true)}>{t("sxUsersXSelect")}</TextAction>
                            ))
                        }
                    >
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
                                title={filtering ? t("sxUsersNoMatch") : t("sxUsersEmpty")}
                                description={filtering ? t("sxUsersNoMatchDescription") : t("sxUsersEmptyDescription")}
                                action={
                                    filtering ? (
                                        filters.length > 0 ? (
                                            <Button type="button" variant="plain" onClick={clearFilters}>
                                                {t("sxEventsClearFilters")}
                                            </Button>
                                        ) : undefined
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="h-8.5 px-4 font-medium"
                                            onClick={() => navigate(`/${realm}/users/new`)}
                                        >
                                            {t("sxUsersNew")}
                                        </Button>
                                    )
                                }
                            />
                        )}
                        {status === "ready" && users.length > 0 && selecting && (
                            <ul className={GROUP}>
                                {users.map((user, i) => {
                                    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
                                    return (
                                        <li key={user.id} data-testid={`user-${user.username}`}>
                                            {i > 0 && <div className={SEPARATOR} />}
                                            <label className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
                                                <Checkbox
                                                    checked={selected.has(user.id)}
                                                    onCheckedChange={() => toggleSelected(user.id)}
                                                />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-base font-medium">{user.username}</span>
                                                    <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                        {[fullName, user.email].filter(Boolean).join(" · ") || "—"}
                                                    </span>
                                                </span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {status === "ready" && users.length > 0 && !selecting && (
                            <Group>
                                {users.map(user => {
                                    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
                                    const locked = !!user.bruteForceStatus?.disabled;
                                    return (
                                        <Row
                                            key={user.id}
                                            testId={`user-${user.username}`}
                                            onClick={() => navigate(`/${realm}/users/${user.id}`)}
                                            leading={<Avatar name={fullName || user.username} />}
                                            title={user.username}
                                            subtitle={[fullName, user.email].filter(Boolean).join(" · ") || "—"}
                                            trailing={
                                                <span className="flex flex-wrap justify-end gap-1.5">
                                                    {locked && <Chip tone="warning">{t("sxUsersXTemporarilyLocked")}</Chip>}
                                                    {user.email && !user.emailVerified && (
                                                        <span className="hidden sm:inline-flex">
                                                            <Chip tone="warning">{t("sxUsersEmailUnverified")}</Chip>
                                                        </span>
                                                    )}
                                                    <span className="hidden sm:inline-flex">
                                                        <Chip tone={user.enabled ? "success" : "danger"}>
                                                            {user.enabled ? t("sxCommonEnabled") : t("sxCommonDisabled")}
                                                        </Chip>
                                                    </span>
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
                                    onPrev={() => {
                                        setSelected(new Set());
                                        setFirst(f => Math.max(0, f - PAGE_SIZE));
                                    }}
                                    onNext={() => {
                                        setSelected(new Set());
                                        setFirst(f => f + PAGE_SIZE);
                                    }}
                                />
                            </div>
                        )}
                    </Section>
                </>
            )}
            {confirmNode}
        </AdminPage>
    );
}
