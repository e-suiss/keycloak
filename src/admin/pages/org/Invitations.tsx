// @ts-nocheck
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { i18n } from "../../i18n/i18n";
import { Chip, Group, ListSkeleton, Notice, Pager, Row, SearchField, Section, TextAction } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { ConfirmDialog, TextField } from "../idp/shared";
import { FilterChips, ListState, Monogram, useDebounced } from "./shared";

const PAGE = 20;
const asList = (v: any) => (Array.isArray(v) ? v : []);

const fmt = (sec?: number) => {
    if (!sec) return "—";
    try {
        return new Date(sec * 1000).toLocaleString(i18n.language);
    } catch {
        return String(sec);
    }
};

export function InviteMenu({ onNew, onExisting, size }: any) {
    const t = useT();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size={size}>{t("sxOrgDetailInviteMember")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={size ? "center" : "end"}>
                <DropdownMenuItem onClick={onNew}>{t("sxOrgDetailInviteNewUser")}</DropdownMenuItem>
                <DropdownMenuItem onClick={onExisting}>{t("sxOrgDetailInviteRealmUser")}</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function Invitations({ org }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebounced(searchInput);
    const [statusFilter, setStatusFilter] = useState("");
    const [first, setFirst] = useState(0);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<any>({ status: "loading", list: [], more: false });
    const [inviteNew, setInviteNew] = useState(false);
    const [inviteExisting, setInviteExisting] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => setFirst(0), [search, statusFilter]);

    useEffect(() => {
        let alive = true;
        setState((s: any) => ({ ...s, status: "loading" }));
        const params: any = { orgId: org.id, first, max: PAGE + 1 };
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        adminClient.organizations
            .listInvitations(params)
            .then((r: any) => {
                if (!alive) return;
                const list = asList(r);
                setState({ status: "ready", list: list.slice(0, PAGE), more: list.length > PAGE });
            })
            .catch(() => alive && setState({ status: "error", list: [], more: false }));
        return () => {
            alive = false;
        };
    }, [adminClient, org.id, search, statusFilter, first, attempt]);

    const refresh = () => setAttempt(n => n + 1);

    const resend = async (inv: any) => {
        setBusy(inv.id);
        try {
            await adminClient.organizations.resendInvitation({ orgId: org.id, invitationId: inv.id });
            addAlert(t("sxOrgDetailInvitationResent"), AlertVariant.success);
            refresh();
        } catch (e) {
            addError(t("sxOrgDetailInvitationResendError"), e);
        } finally {
            setBusy(null);
        }
    };

    const copyLink = async (inv: any) => {
        try {
            await navigator.clipboard.writeText(inv.inviteLink);
            addAlert(t("sxOrgDetailInviteLinkCopied"), AlertVariant.success);
        } catch (e) {
            addError(t("sxOrgDetailCopyError"), e);
        }
    };

    const remove = (inv: any) =>
        setConfirmOpts({
            title: t("sxOrgDetailDeleteInvitationTitle"),
            message: t("sxOrgDetailDeleteInvitationMessage", { email: inv.email }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.deleteInvitation({ orgId: org.id, invitationId: inv.id });
                    addAlert(t("sxOrgDetailInvitationDeleted"), AlertVariant.success);
                    refresh();
                } catch (e) {
                    addError(t("sxOrgDetailInvitationDeleteError"), e);
                }
            }
        });

    const filtered = !!search || !!statusFilter;
    const menu = (size?: string) => (
        <InviteMenu size={size} onNew={() => setInviteNew(true)} onExisting={() => setInviteExisting(true)} />
    );

    return (
        <>
            <div className="flex flex-col gap-3">
                <SearchField value={searchInput} onChange={setSearchInput} placeholder={t("sxOrgDetailSearchInvitations")} />
                <FilterChips
                    ariaLabel={t("sxOrgDetailFilterByStatus")}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    items={[
                        { value: "", label: t("sxOrgDetailFilterAll") },
                        { value: "PENDING", label: t("sxOrgDetailInvitationPending") },
                        { value: "EXPIRED", label: t("sxOrgDetailInvitationExpired") }
                    ]}
                />
            </div>
            <Section
                label={t("sxOrgDetailInvitations")}
                action={state.status === "ready" && <div className="shrink-0">{menu("sm")}</div>}
            >
                <ListState
                    status={state.status}
                    count={state.list.length}
                    onRetry={refresh}
                    errorTitle={t("sxOrgDetailInvitationsLoadError")}
                    emptyTitle={filtered ? t("sxOrgDetailNoInvitationsMatch") : t("sxOrgDetailNoInvitations")}
                    emptyDescription={filtered ? t("sxCommonTryDifferentSearch") : t("sxOrgDetailNoInvitationsDescription")}
                    emptyAction={!filtered ? menu("sm") : undefined}
                >
                    <Group>
                        {state.list.map((inv: any) => {
                            const name = [inv.firstName, inv.lastName].filter(Boolean).join(" ");
                            const expired = inv.status === "EXPIRED";
                            return (
                                <li key={inv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="grid size-10 shrink-0 place-items-center">
                                            <Monogram name={name || inv.email} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-base font-medium [overflow-wrap:anywhere]">{inv.email}</span>
                                                <Chip tone={expired ? "warning" : "info"}>
                                                    {expired ? t("sxOrgDetailInvitationExpired") : t("sxOrgDetailInvitationPending")}
                                                </Chip>
                                            </div>
                                            <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                {name ? `${name} · ` : ""}
                                                {t("sxOrgDetailInvitationDates", { sent: fmt(inv.sentDate), expires: fmt(inv.expiresAt) })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-4 ps-13 sm:ps-0">
                                        <TextAction disabled={busy === inv.id} onClick={() => resend(inv)}>
                                            {t("sxOrgDetailResend")}
                                        </TextAction>
                                        {inv.inviteLink && (
                                            <TextAction onClick={() => copyLink(inv)}>{t("sxOrgDetailCopyLink")}</TextAction>
                                        )}
                                        <TextAction tone="danger" onClick={() => remove(inv)}>
                                            {t("sxCommonDelete")}
                                        </TextAction>
                                    </div>
                                </li>
                            );
                        })}
                    </Group>
                </ListState>
                {state.status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={state.more}
                            onPrev={() => setFirst(f => Math.max(0, f - PAGE))}
                            onNext={() => setFirst(f => f + PAGE)}
                        />
                    </div>
                )}
            </Section>
            {inviteNew && (
                <InviteNewModal
                    org={org}
                    onClose={() => setInviteNew(false)}
                    onSent={() => {
                        setInviteNew(false);
                        refresh();
                    }}
                />
            )}
            {inviteExisting && (
                <InviteExistingModal
                    org={org}
                    onClose={() => {
                        setInviteExisting(false);
                        refresh();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </>
    );
}

export function InviteNewModal({ org, onClose, onSent }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const emailOk = /^[^\s@]+@[^\s@]+$/.test(email.trim());

    const send = async () => {
        setTouched(true);
        if (!emailOk) return;
        setSaving(true);
        try {
            const form = new FormData();
            form.append("email", email.trim());
            if (firstName.trim()) form.append("firstName", firstName.trim());
            if (lastName.trim()) form.append("lastName", lastName.trim());
            await adminClient.organizations.invite({ orgId: org.id }, form);
            addAlert(t("sxOrgDetailInviteSent"), AlertVariant.success);
            onSent();
        } catch (e) {
            addError(t("sxOrgDetailInviteSendError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxOrgDetailInviteNewUser")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <TextField
                            id="org-invite-email"
                            type="email"
                            label={t("sxUserDetailEmail")}
                            required
                            error={touched && !emailOk ? t("sxOrgDetailEmailInvalid") : undefined}
                            value={email}
                            onChange={setEmail}
                            placeholder="name@example.com"
                        />
                        <TextField id="org-invite-first" label={t("sxOrgDetailFirstName")} value={firstName} onChange={setFirstName} />
                        <TextField id="org-invite-last" label={t("sxUserDetailLastName")} value={lastName} onChange={setLastName} />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={saving} onClick={send}>
                        {saving ? t("sxOrgDetailSending") : t("sxOrgDetailSend")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export function InviteExistingModal({ org, onClose }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [q, setQ] = useState("");
    const term = useDebounced(q);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<any>({ status: "loading", users: [], members: new Set() });
    const [busy, setBusy] = useState<string | null>(null);
    const [sent, setSent] = useState<Set<string>>(new Set());

    useEffect(() => {
        let alive = true;
        setState((s: any) => ({ ...s, status: "loading" }));
        Promise.all([
            adminClient.users.find({ search: term || undefined, max: 20 }),
            adminClient.organizations.listMembers({ orgId: org.id, max: 500 })
        ])
            .then(([users, members]: any) => {
                if (!alive) return;
                setState({
                    status: "ready",
                    users: asList(users).filter((u: any) => !!u.email),
                    members: new Set(asList(members).map((m: any) => m.id))
                });
            })
            .catch(() => alive && setState({ status: "error", users: [], members: new Set() }));
        return () => {
            alive = false;
        };
    }, [adminClient, org.id, term, attempt]);

    const invite = async (u: any) => {
        setBusy(u.id);
        try {
            const form = new FormData();
            form.append("id", u.id);
            await adminClient.organizations.inviteExistingUser({ orgId: org.id }, form);
            addAlert(t("sxOrgDetailInviteSentTo", { email: u.email }), AlertVariant.success);
            setSent(s => new Set([...s, u.id]));
        } catch (e) {
            addError(t("sxOrgDetailInviteSendError"), e);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxOrgDetailInviteRealmUser")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <SearchField value={q} onChange={setQ} placeholder={t("sxOrgDetailSearchUsers")} />
                        <p className="px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{t("sxOrgDetailInviteRealmUserHint")}</p>
                        <div className="max-h-[50svh] overflow-y-auto">
                            {state.status === "loading" ? (
                                <ListSkeleton />
                            ) : state.status === "error" ? (
                                <Notice
                                    title={t("sxOrgDetailUserSearchError")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={() => setAttempt(n => n + 1)}
                                />
                            ) : state.users.length === 0 ? (
                                <Notice
                                    title={t("sxOrgDetailNoUsersFound")}
                                    description={term ? t("sxOrgDetailNoUsersFoundSearch") : t("sxOrgDetailNoUsersWithEmail")}
                                />
                            ) : (
                                <Group>
                                    {state.users.map((u: any) => (
                                        <Row
                                            key={u.id}
                                            leading={<Monogram name={u.username} />}
                                            title={u.username}
                                            subtitle={u.email}
                                            trailing={
                                                state.members.has(u.id) ? (
                                                    <Chip>{t("sxOrgDetailMemberChip")}</Chip>
                                                ) : sent.has(u.id) ? (
                                                    <Chip tone="success">{t("sxOrgDetailInvitedChip")}</Chip>
                                                ) : (
                                                    <TextAction disabled={busy === u.id} onClick={() => invite(u)}>
                                                        {t("sxOrgDetailInvite")}
                                                    </TextAction>
                                                )
                                            }
                                        />
                                    ))}
                                </Group>
                            )}
                        </div>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
