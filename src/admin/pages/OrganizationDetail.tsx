// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
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
import { type ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import {
    AdminPage,
    Chip,
    GROUP,
    Pager,
    Group,
    ListSkeleton,
    Notice,
    Row,
    SEPARATOR,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";
import { Invitations } from "./org/Invitations";
import { LinkIdpModal, ORG_DOMAIN } from "./org/LinkIdpModal";
import { OrgGroups } from "./org/OrgGroups";
import { FilterChips, useDebounced } from "./org/shared";

const TABS = [
    { value: "settings", label: "sxOrgDetailTabSettings" },
    { value: "attributes", label: "sxOrgDetailTabAttributes" },
    { value: "members", label: "sxOrgDetailTabMembers" },
    { value: "groups", label: "sxNavGroups" },
    { value: "idps", label: "sxOrgDetailTabIdps" }
];

const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

const lines = (s: string) =>
    s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
const domainNames = (org: any) =>
    (org?.domains || []).map((d: any) => (typeof d === "string" ? d : d?.name)).filter(Boolean);
const asList = (value: any) => (Array.isArray(value) ? value : []);

function useResource(fetcher: () => Promise<any>, deps: any[]) {
    const [state, setState] = useState<{ status: "loading" | "error" | "ready"; data: any }>({
        status: "loading",
        data: null
    });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState(s => (s.status === "ready" ? s : { status: "loading", data: null }));
        fetcher()
            .then(data => alive && setState({ status: "ready", data }))
            .catch(() => alive && setState({ status: "error", data: null }));
        return () => {
            alive = false;
        };
    }, [...deps, attempt]);
    const setData = (updater: any) =>
        setState(s => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
    const reload = () => setAttempt(n => n + 1);
    return { status: state.status, data: state.data, setData, reload };
}

function Monogram({ name }: { name: string }) {
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
            {initials(name)}
        </span>
    );
}

function Footnote({ children }: { children: ReactNode }) {
    return <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}

function SaveBar({ children }: { children: ReactNode }) {
    return <div className="flex justify-end">{children}</div>;
}

function ListState({
    status,
    count,
    onRetry,
    errorTitle,
    emptyTitle,
    emptyDescription,
    emptyAction,
    children
}: {
    status: string;
    count: number;
    onRetry: () => void;
    errorTitle: string;
    emptyTitle: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    children: ReactNode;
}) {
    const t = useT();
    if (status === "loading") return <ListSkeleton />;
    if (status === "error")
        return (
            <Notice title={errorTitle} description={t("sxLoadErrorDescription")} onRetry={onRetry} />
        );
    if (count === 0) return <Notice title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    return <>{children}</>;
}

function ConfirmDialog({ opts, onClose }: { opts: any; onClose: () => void }) {
    const t = useT();
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && onClose()}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = opts?.onConfirm;
                            onClose();
                            fn?.();
                        }}
                    >
                        {opts?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
}

export default function OrganizationDetail() {
    const { id } = useParams();
    return <OrganizationView key={id} id={id} />;
}

function OrganizationView({ id }: { id: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const [tab, setTab] = useState("settings");
    const { status, data: org, reload } = useResource(
        () => adminClient.organizations.findOne({ id }),
        [adminClient, id]
    );

    const back = { label: t("sxOrgsTitle"), to: `/${realm}/organizations` };

    if (status !== "ready" || !org)
        return (
            <AdminPage title={t("sxOrgDetailTitle")} back={back}>
                {status === "loading" && <ListSkeleton rows={4} />}
                {status === "error" && (
                    <Notice
                        title={t("sxOrgDetailLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={reload}
                    />
                )}
                {status === "ready" && (
                    <Notice
                        title={t("sxOrgDetailNotFound")}
                        description={t("sxOrgDetailNotFoundDescription")}
                        action={
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate(back.to)}>
                                {t("sxOrgDetailBackToList")}
                            </Button>
                        }
                    />
                )}
            </AdminPage>
        );

    const domains = domainNames(org);

    return (
        <AdminPage
            back={back}
            title={org.name}
            description={<span className="font-mono text-[15px] [overflow-wrap:anywhere]">{org.alias || org.id}</span>}
        >
            <SegmentTabs value={tab} onChange={setTab} items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxOrgDetailSections")}
            />
            {tab === "settings" && (
                <SettingsTab
                    org={org}
                    domains={domains}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/organizations`)}
                />
            )}
            {tab === "attributes" && <AttributesTab org={org} reload={reload} />}
            {tab === "members" && <MembersSection org={org} />}
            {tab === "groups" && <OrgGroups org={org} />}
            {tab === "idps" && <IdpTab org={org} domains={domains} />}
        </AdminPage>
    );
}

function SettingsTab({ org, domains, reload, onDeleted }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [name, setName] = useState(org.name || "");
    const [description, setDescription] = useState(org.description || "");
    const [redirectUrl, setRedirectUrl] = useState(org.redirectUrl || "");
    const [enabled, setEnabled] = useState(org.enabled !== false);
    const [domainsText, setDomainsText] = useState(domains.join("\n"));
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const n = name.trim();
        if (!n) return;
        setSaving(true);
        try {
            const existing = org.domains || [];
            const verifiedBy = new Map(
                existing.map((d: any) => [
                    typeof d === "string" ? d : d?.name,
                    typeof d === "string" ? false : !!d?.verified
                ])
            );
            const rep = {
                ...org,
                name: n,
                description: description.trim() || undefined,
                redirectUrl: redirectUrl.trim() || undefined,
                enabled,
                domains: lines(domainsText).map(d => ({
                    name: d,
                    verified: !!verifiedBy.get(d)
                }))
            };
            await adminClient.organizations.updateById({ id: org.id }, rep);
            addAlert(t("sxOrgDetailUpdated"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxCommonUpdateError"), e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: t("sxOrgDetailDelete"),
            message: t("sxOrgDetailDeleteConfirm", { name: org.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.delById({ id: org.id });
                    addAlert(t("sxOrgDetailDeleted"), AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    return (
        <>
            <Section label={t("sxOrgDetailGeneral")}>
                <div className="flex flex-col gap-4">
                    <Field size="lg">
                        <FieldLabel htmlFor="org-name">{t("sxCommonName")}</FieldLabel>
                        <Input size="lg" id="org-name" value={name} onChange={(e: any) => setName(e.target.value)} />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="org-alias">{t("sxOrgsAlias")}</FieldLabel>
                        <Input
                            size="lg"
                            id="org-alias"
                            readOnly
                            value={org.alias || "—"}
                            className="font-mono text-muted-foreground"
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="org-domains">{t("sxOrgsDomains")}</FieldLabel>
                        <Textarea
                            size="lg"
                            id="org-domains"
                            rows={3}
                            value={domainsText}
                            onChange={(e: any) => setDomainsText(e.target.value)}
                            placeholder={"acme.com\nacme.org"}
                        />
                        <FieldDescription>{t("sxOrgsDomainsHelp")}</FieldDescription>
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="org-redirect-url">{t("sxOrgDetailRedirectUrl")}</FieldLabel>
                        <Input
                            size="lg"
                            id="org-redirect-url"
                            type="url"
                            value={redirectUrl}
                            onChange={(e: any) => setRedirectUrl(e.target.value)}
                            placeholder="https://acme.com/welcome"
                        />
                        <FieldDescription>{t("sxOrgDetailRedirectUrlHint")}</FieldDescription>
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="org-description">{t("sxCommonDescription")}</FieldLabel>
                        <Textarea
                            size="lg"
                            id="org-description"
                            rows={2}
                            value={description}
                            onChange={(e: any) => setDescription(e.target.value)}
                            placeholder={t("sxOrgsDescriptionPlaceholder")}
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="org-id">{t("sxOrgDetailId")}</FieldLabel>
                        <Input
                            size="lg"
                            id="org-id"
                            readOnly
                            value={org.id}
                            className="font-mono text-[15px] text-muted-foreground"
                        />
                    </Field>
                    <Group>
                        <Row
                            className="min-h-13"
                            title={t("sxCommonEnabled")}
                            subtitle={t("sxOrgDetailEnabledHint")}
                            trailing={
                                <Switch
                                    aria-label={t("sxCommonEnabled")}
                                    checked={enabled}
                                    onCheckedChange={(v: boolean) => setEnabled(v)}
                                />
                            }
                        />
                    </Group>
                </div>
            </Section>
            <SaveBar>
                <Button size="form" disabled={saving || !name.trim()} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>
            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxOrgDetailDeleteHelp")}
                </p>
                <Button size="form" className={DANGER_BUTTON} onClick={remove}>
                    {t("sxOrgDetailDelete")}
                </Button>
            </section>
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </>
    );
}

function AttributesTab({ org, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(org.attributes));
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, field: string, val: string) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    const addRow = () => setRows([...rows, { k: "", v: "" }]);
    const delRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

    const save = async () => {
        setSaving(true);
        try {
            const attributes: any = {};
            rows.forEach(r => {
                const key = r.k.trim();
                if (key)
                    attributes[key] = String(r.v)
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
            });
            await adminClient.organizations.updateById({ id: org.id }, { ...org, attributes });
            addAlert(t("sxOrgDetailAttributesSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Section
                label={t("sxOrgDetailTabAttributes")}
                action={<TextAction onClick={addRow}>{t("sxOrgDetailAddAttribute")}</TextAction>}
            >
                {rows.length === 0 ? (
                    <Notice
                        title={t("sxOrgDetailNoAttributes")}
                        description={t("sxOrgDetailNoAttributesDescription")}
                        action={
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={addRow}>
                                {t("sxOrgDetailAddAttribute")}
                            </Button>
                        }
                    />
                ) : (
                    <ul className={GROUP}>
                        {rows.map((r, i) => (
                            <li key={i}>
                                {i > 0 && <div className={SEPARATOR} />}
                                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                                    <Input
                                        className="font-medium sm:w-2/5"
                                        aria-label={t("sxCommonKey")}
                                        value={r.k}
                                        onChange={(e: any) => setRow(i, "k", e.target.value)}
                                        placeholder={t("sxCommonKeyPlaceholder")}
                                    />
                                    <Input
                                        className="sm:flex-1"
                                        aria-label={t("sxCommonValue")}
                                        value={r.v}
                                        onChange={(e: any) => setRow(i, "v", e.target.value)}
                                        placeholder={t("sxOrgDetailValuePlaceholder")}
                                    />
                                    <TextAction
                                        tone="danger"
                                        className="self-end sm:self-auto"
                                        onClick={() => delRow(i)}
                                    >
                                        {t("sxCommonDelete")}
                                    </TextAction>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
            <SaveBar>
                <Button size="form" disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>
        </>
    );
}

function MembersSection({ org }: any) {
    const t = useT();
    const [view, setView] = useState("members");
    return (
        <>
            <SegmentTabs
                value={view}
                onChange={setView}
                ariaLabel={t("sxOrgDetailTabMembers")}
                items={[
                    { value: "members", label: t("sxOrgDetailTabMembers") },
                    { value: "invitations", label: t("sxOrgDetailInvitations") }
                ]}
            />
            {view === "members" ? <MembersTab org={org} /> : <Invitations org={org} />}
        </>
    );
}

const MEMBER_PAGE = 20;

function MembersTab({ org }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [searchInput, setSearchInput] = useState("");
    const search = useDebounced(searchInput);
    const [membership, setMembership] = useState("");
    const [first, setFirst] = useState(0);
    useEffect(() => setFirst(0), [search, membership]);
    const res = useResource(
        () =>
            adminClient.organizations
                .listMembers({
                    orgId: org.id,
                    first,
                    max: MEMBER_PAGE + 1,
                    ...(search ? { search } : {}),
                    ...(membership ? { membershipType: membership } : {})
                })
                .then(asList),
        [adminClient, org.id, search, membership, first]
    );
    const all = res.data || [];
    const members = all.slice(0, MEMBER_PAGE);
    const hasMore = all.length > MEMBER_PAGE;
    const filtered = !!search || !!membership;
    const [adding, setAdding] = useState(false);

    const removeMember = (u: any) =>
        confirm({
            title: t("sxOrgDetailRemoveMember"),
            message: t("sxOrgDetailRemoveMemberConfirm", { username: u.username }),
            confirmLabel: t("sxCommonRemoveFrom"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.delMember({
                        orgId: org.id,
                        userId: u.id
                    });
                    addAlert(t("sxOrgDetailMemberRemoved"), AlertVariant.success);
                    res.setData((list: any[]) => (list || []).filter(m => m.id !== u.id));
                } catch (e) {
                    addError(t("sxOrgDetailMemberRemoveError"), e);
                }
            }
        });

    const typeLabel = (type: string) =>
        String(type).toUpperCase() === "MANAGED"
            ? t("sxOrgDetailManaged")
            : String(type).toUpperCase() === "UNMANAGED"
              ? t("sxOrgDetailUnmanaged")
              : type;

    return (
        <>
            <div className="flex flex-col gap-3">
                <SearchField value={searchInput} onChange={setSearchInput} placeholder={t("sxOrgDetailSearchMembers")} />
                <FilterChips
                    ariaLabel={t("sxOrgDetailFilterByMembership")}
                    value={membership}
                    onChange={setMembership}
                    items={[
                        { value: "", label: t("sxOrgDetailFilterAll") },
                        { value: "MANAGED", label: t("sxOrgDetailManaged") },
                        { value: "UNMANAGED", label: t("sxOrgDetailUnmanaged") }
                    ]}
                />
            </div>
            <Section
                label={t("sxOrgDetailTabMembers")}
                action={res.status === "ready" && <TextAction onClick={() => setAdding(true)}>{t("sxOrgDetailAddMember")}</TextAction>}
            >
                <ListState
                    status={res.status}
                    count={members.length}
                    onRetry={res.reload}
                    errorTitle={t("sxOrgDetailMembersLoadError")}
                    emptyTitle={filtered ? t("sxOrgDetailNoMembersMatch") : t("sxOrgDetailNoMembers")}
                    emptyDescription={filtered ? t("sxCommonTryDifferentSearch") : t("sxOrgDetailNoMembersDescription")}
                    emptyAction={
                        filtered ? (
                            <Button
                                size="sm"
                                variant="plain"
                                onClick={() => {
                                    setSearchInput("");
                                    setMembership("");
                                }}
                            >
                                {t("sxEventsClearFilters")}
                            </Button>
                        ) : (
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setAdding(true)}>
                                {t("sxOrgDetailAddMember")}
                            </Button>
                        )
                    }
                >
                    <Group>
                        {members.map(u => (
                            <Row
                                key={u.id}
                                leading={<Monogram name={u.username} />}
                                title={u.username}
                                subtitle={
                                    <>
                                        {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                                        {(u.firstName || u.lastName) && u.email ? " · " : ""}
                                        {u.email || (!u.firstName && !u.lastName ? "—" : "")}
                                    </>
                                }
                                trailing={
                                    <>
                                        {u.membershipType && (
                                            <span className="hidden sm:inline-flex">
                                                <Chip tone={String(u.membershipType).toUpperCase() === "MANAGED" ? "info" : "neutral"}>
                                                    {typeLabel(u.membershipType)}
                                                </Chip>
                                            </span>
                                        )}
                                        <TextAction tone="danger" onClick={() => removeMember(u)}>
                                            {t("sxCommonRemoveFrom")}
                                        </TextAction>
                                    </>
                                }
                            />
                        ))}
                    </Group>
                </ListState>
                {res.status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / MEMBER_PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={hasMore}
                            onPrev={() => setFirst(f => Math.max(0, f - MEMBER_PAGE))}
                            onNext={() => setFirst(f => f + MEMBER_PAGE)}
                        />
                    </div>
                )}
                {adding && (
                    <AddMemberModal
                        org={org}
                        existing={new Set(members.map(m => m.id))}
                        onClose={() => setAdding(false)}
                        onAdded={() => {
                            setAdding(false);
                            res.reload();
                        }}
                    />
                )}
                <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
            </Section>
        </>
    );
}

function AddMemberModal({ org, existing, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [q, setQ] = useState("");
    const [term, setTerm] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [results, setResults] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.users
            .find({ search: term || undefined, max: 20 })
            .then(r => {
                if (!alive) return;
                setResults(Array.isArray(r) ? r : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, term, attempt]);

    const search = () => {
        setTerm(q.trim());
        setAttempt(n => n + 1);
    };

    const add = async (u: any) => {
        setBusy(u.id);
        try {
            await adminClient.organizations.addMember({ orgId: org.id, userId: u.id });
            addAlert(t("sxOrgDetailMemberAdded", { username: u.username }), AlertVariant.success);
            onAdded();
        } catch (e) {
            addError(t("sxOrgDetailMemberAddError"), e);
            setBusy(null);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxOrgDetailAddMember")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <SearchField value={q} onChange={setQ} onEnter={search} placeholder={t("sxOrgDetailSearchUsers")} />
                        <div className="max-h-[50svh] overflow-y-auto">
                            {status === "loading" ? (
                                <ListSkeleton />
                            ) : status === "error" ? (
                                <Notice
                                    title={t("sxOrgDetailUserSearchError")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={() => setAttempt(n => n + 1)}
                                />
                            ) : results.length === 0 ? (
                                <Notice
                                    title={t("sxOrgDetailNoUsersFound")}
                                    description={
                                        term ? t("sxOrgDetailNoUsersFoundSearch") : t("sxOrgDetailNoUsersFoundDescription")
                                    }
                                />
                            ) : (
                                <Group>
                                    {results.map(u => {
                                        const inOrg = existing.has(u.id);
                                        return (
                                            <Row
                                                key={u.id}
                                                leading={<Monogram name={u.username} />}
                                                title={u.username}
                                                subtitle={u.email || "—"}
                                                trailing={
                                                    inOrg ? (
                                                        <Chip>{t("sxOrgDetailMemberChip")}</Chip>
                                                    ) : (
                                                        <TextAction disabled={busy === u.id} onClick={() => add(u)}>
                                                            {t("sxCommonAdd")}
                                                        </TextAction>
                                                    )
                                                }
                                            />
                                        );
                                    })}
                                </Group>
                            )}
                        </div>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function IdpTab({ org, domains }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const res = useResource(
        () =>
            adminClient.organizations
                .listIdentityProviders({ orgId: org.id })
                .then(asList)
                .then(list => [...list].sort((a, b) => String(a.alias).localeCompare(String(b.alias)))),
        [adminClient, org.id]
    );
    const linked = res.data || [];
    const [linking, setLinking] = useState<any>(null);

    const toggleShown = async (idp: any) => {
        const hideOnLogin = !idp.hideOnLogin;
        try {
            const found = await adminClient.identityProviders.findOne({ alias: idp.alias });
            await adminClient.identityProviders.update({ alias: idp.alias }, { ...(found || idp), hideOnLogin });
            addAlert(t("sxOrgDetailIdpLinkUpdated"), AlertVariant.success);
            res.setData((list: any[]) => (list || []).map(x => (x.alias === idp.alias ? { ...x, hideOnLogin } : x)));
        } catch (e) {
            addError(t("sxCommonUpdateError"), e);
        }
    };

    const unlink = (idp: any) =>
        confirm({
            title: t("sxOrgDetailUnlinkIdp"),
            message: t("sxOrgDetailUnlinkIdpConfirm", { name: idp.displayName || idp.alias }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.unLinkIdp({
                        orgId: org.id,
                        alias: idp.alias
                    });
                    addAlert(t("sxOrgDetailIdpUnlinked"), AlertVariant.success);
                    res.setData((list: any[]) => (list || []).filter(x => x.alias !== idp.alias));
                } catch (e) {
                    addError(t("sxCommonRemoveError"), e);
                }
            }
        });

    const domainLabel = (idp: any) => {
        const d = idp.config?.[ORG_DOMAIN];
        if (!d) return t("sxOrgDetailDomainNone");
        if (d === "ANY") return t("sxOrgDetailDomainAny");
        return d;
    };

    return (
        <>
            <Section
                label={res.status === "ready" ? t("sxOrgDetailIdpCount", { total: linked.length }) : t("sxOrgDetailTabIdps")}
                action={res.status === "ready" && <TextAction onClick={() => setLinking({})}>{t("sxOrgDetailLink")}</TextAction>}
            >
                <ListState
                    status={res.status}
                    count={linked.length}
                    onRetry={res.reload}
                    errorTitle={t("sxOrgDetailIdpsLoadError")}
                    emptyTitle={t("sxOrgDetailNoIdps")}
                    emptyDescription={t("sxOrgDetailNoIdpsDescription")}
                    emptyAction={
                        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setLinking({})}>
                            {t("sxOrgDetailLinkIdp")}
                        </Button>
                    }
                >
                    <Group>
                        {linked.map(idp => (
                            <Row
                                key={idp.alias}
                                title={idp.displayName || idp.alias}
                                subtitle={
                                    <>
                                        <span className="font-mono">
                                            {idp.alias} · {idp.providerId}
                                        </span>
                                        {" · "}
                                        {t("sxOrgDetailDomainValue", { domain: domainLabel(idp) })}
                                        {String(idp.config?.["kc.org.broker.redirect.mode.email-matches"]) === "true" && (
                                            <>
                                                {" · "}
                                                {t("sxOrgDetailRedirectOn")}
                                            </>
                                        )}
                                    </>
                                }
                                trailing={
                                    <>
                                        <TextAction onClick={() => setLinking(idp)}>{t("sxOrgDetailEdit")}</TextAction>
                                        <TextAction tone="danger" onClick={() => unlink(idp)}>
                                            {t("sxCommonRemove")}
                                        </TextAction>
                                    </>
                                }
                            />
                        ))}
                    </Group>
                </ListState>
            </Section>
            {res.status === "ready" && linked.length > 0 && (
                <Section label={t("sxOrgDetailShowOnLogin")}>
                    <Group>
                        {linked.map(idp => (
                            <Row
                                key={idp.alias}
                                className="min-h-13"
                                title={idp.displayName || idp.alias}
                                subtitle={t("sxOrgDetailShowOnLogin")}
                                trailing={
                                    <Switch
                                        aria-label={t("sxOrgDetailShowOnLoginAria", { name: idp.displayName || idp.alias })}
                                        checked={!idp.hideOnLogin}
                                        onCheckedChange={() => toggleShown(idp)}
                                    />
                                }
                            />
                        ))}
                    </Group>
                </Section>
            )}
            {linking && (
                <LinkIdpModal
                    org={org}
                    domains={domains}
                    linked={new Set(linked.map(i => i.alias))}
                    identityProvider={linking.alias ? linking : null}
                    onClose={() => setLinking(null)}
                    onSaved={() => {
                        setLinking(null);
                        res.reload();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </>
    );
}
