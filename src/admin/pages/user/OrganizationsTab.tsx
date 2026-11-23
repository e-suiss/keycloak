// @ts-nocheck

import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, GROUP, Group, ListSkeleton, Notice, Row, SEPARATOR, SearchField, Section, TextAction } from "../../ui/kit";
import { useRealm } from "../../ui/realm";
import { ListState, asList, useConfirm, useResource } from "./shared";

export function OrganizationsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [picker, setPicker] = useState<null | "join" | "invite">(null);
    const [query, setQuery] = useState("");
    const res = useResource(
        async () => {
            const orgs = asList(await adminClient.organizations.memberOrganizations({ userId: user.id }));
            return Promise.all(
                orgs.map(async (org: any) => {
                    const member = await adminClient.organizations
                        .getMember({ orgId: org.id, userId: user.id })
                        .catch(() => null);
                    return { ...org, membershipType: member?.membershipType };
                })
            );
        },
        [adminClient, user.id]
    );
    const orgs = (res.data || []).filter(
        (o: any) => !query.trim() || (o.name || "").toLowerCase().includes(query.trim().toLowerCase())
    );

    const remove = (org: any) =>
        confirm({
            title: t("sxUserDetailXLeaveOrganization"),
            message: t("sxUserDetailXLeaveOrganizationConfirm", { name: org.name }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.delMember({ orgId: org.id, userId: user.id });
                    addAlert(t("sxUserDetailXOrganizationLeft"), AlertVariant.success);
                    res.setData((list: any[]) => (list || []).filter(x => x.id !== org.id));
                } catch (e) {
                    addError(t("sxCommonRemoveError"), e);
                }
            }
        });

    const typeLabel = (type?: string) =>
        String(type || "").toUpperCase() === "MANAGED" ? t("sxUserDetailXManaged") : t("sxUserDetailXUnmanaged");

    return (
        <>
            {res.status === "ready" && (res.data || []).length > 0 && (
                <SearchField value={query} onChange={setQuery} placeholder={t("sxUserDetailXSearchOrganizations")} />
            )}
            <Section
                label={t("sxUserDetailXTabOrganizations")}
                action={
                    res.status === "ready" && (
                        <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                            <TextAction onClick={() => setPicker("invite")} disabled={!user.email}>
                                {t("sxUserDetailXSendInvite")}
                            </TextAction>
                            <TextAction onClick={() => setPicker("join")}>{t("sxUserDetailXJoinOrganization")}</TextAction>
                        </span>
                    )
                }
            >
                <ListState
                    status={res.status}
                    count={orgs.length}
                    onRetry={res.reload}
                    errorTitle={t("sxUserDetailXOrganizationsLoadError")}
                    emptyTitle={query.trim() ? t("sxUserDetailXNoMatchingOrganizations") : t("sxUserDetailXNoOrganizations")}
                    emptyDescription={query.trim() ? t("sxCommonTryDifferentSearch") : t("sxUserDetailXNoOrganizationsDescription")}
                    emptyAction={
                        query.trim() ? undefined : (
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setPicker("join")}>
                                {t("sxUserDetailXJoinOrganization")}
                            </Button>
                        )
                    }
                >
                    <Group>
                        {orgs.map((o: any) => (
                            <Row
                                key={o.id}
                                title={
                                    <button
                                        type="button"
                                        className="truncate rounded-md text-start outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50"
                                        onClick={() => navigate(`/${realm}/organizations/${o.id}`)}
                                    >
                                        {o.name}
                                    </button>
                                }
                                subtitle={(o.domains || []).map((d: any) => d.name).filter(Boolean).join(", ") || o.description}
                                trailing={
                                    <span className="flex items-center gap-3">
                                        <span className="hidden sm:inline-flex">
                                            <Chip tone={String(o.membershipType || "").toUpperCase() === "MANAGED" ? "info" : "neutral"}>
                                                {typeLabel(o.membershipType)}
                                            </Chip>
                                        </span>
                                        <TextAction tone="danger" onClick={() => remove(o)}>
                                            {t("sxCommonRemove")}
                                        </TextAction>
                                    </span>
                                }
                            />
                        ))}
                    </Group>
                </ListState>
            </Section>
            {picker && (
                <OrganizationPicker
                    mode={picker}
                    user={user}
                    existing={res.data || []}
                    onClose={() => setPicker(null)}
                    onDone={() => {
                        setPicker(null);
                        res.reload();
                    }}
                />
            )}
            {confirmNode}
        </>
    );
}

function OrganizationPicker({ mode, user, existing, onClose, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [sel, setSel] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setSearch(query.trim()), 300);
        return () => clearTimeout(id);
    }, [query]);

    const res = useResource(
        () => adminClient.organizations.find({ search: search || undefined, first: 0, max: 50 }).then(asList),
        [adminClient, search]
    );
    const list = (res.data || []).filter((o: any) => !existing.some((e: any) => e.id === o.id));
    const chosen = Object.values(sel);

    const toggle = (o: any) =>
        setSel(p => {
            const n = { ...p };
            n[o.id] ? delete n[o.id] : (n[o.id] = o);
            return n;
        });

    const submit = async () => {
        if (!chosen.length) return;
        setSaving(true);
        try {
            await Promise.all(
                chosen.map((o: any) => {
                    if (mode === "join") return adminClient.organizations.addMember({ orgId: o.id, userId: user.id });
                    const form = new FormData();
                    form.append("id", user.id);
                    return adminClient.organizations.inviteExistingUser({ orgId: o.id }, form);
                })
            );
            addAlert(
                mode === "join" ? t("sxUserDetailXOrganizationJoined") : t("sxUserDetailXInviteSent"),
                AlertVariant.success
            );
            onDone();
        } catch (e) {
            addError(mode === "join" ? t("sxUserDetailXOrganizationJoinError") : t("sxUserDetailXInviteError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{mode === "join" ? t("sxUserDetailXJoinOrganization") : t("sxUserDetailXSendInvite")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <SearchField value={query} onChange={setQuery} placeholder={t("sxUserDetailXSearchOrganizations")} />
                        <div className="max-h-[45svh] overflow-y-auto">
                            {res.status === "loading" && <ListSkeleton />}
                            {res.status === "error" && (
                                <Notice
                                    title={t("sxUserDetailXOrganizationsLoadError")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={res.reload}
                                />
                            )}
                            {res.status === "ready" && list.length === 0 && (
                                <Notice
                                    title={t("sxUserDetailXNoAvailableOrganizations")}
                                    description={search ? t("sxCommonTryDifferentSearch") : t("sxUserDetailXNoAvailableOrganizationsDescription")}
                                />
                            )}
                            {res.status === "ready" && list.length > 0 && (
                                <ul className={GROUP}>
                                    {list.map((o: any, i: number) => (
                                        <li key={o.id}>
                                            {i > 0 && <div className={SEPARATOR} />}
                                            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
                                                <Checkbox checked={!!sel[o.id]} onCheckedChange={() => toggle(o)} />
                                                <span className="min-w-0">
                                                    <span className="block text-[15px] font-medium [overflow-wrap:anywhere]">{o.name}</span>
                                                    {o.description && (
                                                        <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                            {o.description}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={saving || chosen.length === 0} onClick={submit}>
                        {mode === "join"
                            ? t("sxUserDetailXJoinCount", { total: chosen.length })
                            : t("sxUserDetailXInviteCount", { total: chosen.length })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
