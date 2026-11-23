// @ts-nocheck

import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { GROUP, ListSkeleton, Notice, SEPARATOR, SearchField, Section } from "../../ui/kit";
import { useRealm } from "../../ui/realm";
import { RequiredActionsPicker, TextField, asList, useResource } from "./shared";

const UNITS = [
    { value: 60, label: "sxUserDetailXMinutes" },
    { value: 3600, label: "sxUserDetailXHours" },
    { value: 86400, label: "sxUserDetailXDays" }
];

function splitLifespan(seconds?: number) {
    if (!seconds) return { amount: "12", unit: 3600 };
    const unit = [...UNITS].reverse().find(u => seconds % u.value === 0) || UNITS[0];
    return { amount: String(Math.max(1, Math.round(seconds / unit.value))), unit: unit.value };
}

export function ExecuteActionsModal({ userId, onClose }: { userId: string; onClose: () => void }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [actions, setActions] = useState<string[]>([]);
    const [amount, setAmount] = useState("12");
    const [unit, setUnit] = useState(3600);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let alive = true;
        adminClient.realms
            .findOne({ realm })
            .then((rep: any) => {
                if (!alive) return;
                const split = splitLifespan(rep?.actionTokenGeneratedByAdminLifespan);
                setAmount(split.amount);
                setUnit(split.unit);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [adminClient, realm]);

    const lifespan = Number(amount) > 0 ? Math.round(Number(amount) * unit) : undefined;

    const send = async () => {
        if (!actions.length) return;
        setSending(true);
        try {
            await adminClient.users.executeActionsEmail({ id: userId, actions, lifespan });
            addAlert(t("sxUserDetailXActionsEmailSent"), AlertVariant.success);
            onClose();
        } catch (e) {
            addError(t("sxUserDetailXActionsEmailError"), e);
            setSending(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxUserDetailXActionsEmailTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex max-h-[60svh] flex-col gap-5 overflow-y-auto">
                        <Section label={t("sxUserDetailXActionsToPerform")}>
                            <RequiredActionsPicker value={actions} onChange={setActions} />
                        </Section>
                        <Field size="lg">
                            <FieldLabel htmlFor="actions-lifespan">{t("sxUserDetailXLifespan")}</FieldLabel>
                            <div className="flex gap-3">
                                <Input
                                    size="lg"
                                    id="actions-lifespan"
                                    type="number"
                                    min={1}
                                    className="min-w-0 flex-1"
                                    value={amount}
                                    onChange={(e: any) => setAmount(e.target.value)}
                                />
                                <NativeSelect
                                    size="lg"
                                    className="w-36 shrink-0"
                                    aria-label={t("sxUserDetailXLifespanUnit")}
                                    value={String(unit)}
                                    onChange={(e: any) => setUnit(Number(e.target.value))}
                                >
                                    {UNITS.map(u => (
                                        <NativeSelectOption key={u.value} value={String(u.value)}>
                                            {t(u.label)}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </div>
                            <FieldDescription className="ps-0.5 text-[13px]">
                                {t("sxUserDetailXLifespanHint")}
                            </FieldDescription>
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={sending || actions.length === 0} onClick={send}>
                        {sending ? t("sxUserDetailXSending") : t("sxUserDetailXSendEmail")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function flattenGroups(groups: any[], out: any[] = []) {
    groups.forEach(g => {
        out.push(g);
        if (Array.isArray(g.subGroups) && g.subGroups.length) flattenGroups(g.subGroups, out);
    });
    return out;
}

export function GroupPickerModal({
    exclude,
    onClose,
    onPick
}: {
    exclude: any[];
    onClose: () => void;
    onPick: (groups: any[]) => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [sel, setSel] = useState<Record<string, any>>({});

    useEffect(() => {
        const id = setTimeout(() => setSearch(query.trim()), 300);
        return () => clearTimeout(id);
    }, [query]);

    const res = useResource(
        () =>
            adminClient.groups
                .find({ search: search || undefined, first: 0, max: 100, briefRepresentation: true })
                .then((list: any) => flattenGroups(asList(list))),
        [adminClient, search]
    );
    const groups = (res.data || []).filter((g: any) => !exclude.some(x => x.id === g.id));
    const chosen = Object.values(sel);

    const toggle = (g: any) =>
        setSel(p => {
            const n = { ...p };
            n[g.id] ? delete n[g.id] : (n[g.id] = g);
            return n;
        });

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxUserDetailXJoinGroups")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <SearchField value={query} onChange={setQuery} placeholder={t("sxUserDetailXSearchGroups")} />
                        <div className="max-h-[45svh] overflow-y-auto">
                            {res.status === "loading" && <ListSkeleton />}
                            {res.status === "error" && (
                                <Notice
                                    title={t("sxUserDetailGroupsLoadError")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={res.reload}
                                />
                            )}
                            {res.status === "ready" && groups.length === 0 && (
                                <Notice
                                    title={t("sxUserDetailNoJoinableGroups")}
                                    description={search ? t("sxCommonTryDifferentSearch") : t("sxUserDetailNoRealmGroupsDescription")}
                                />
                            )}
                            {res.status === "ready" && groups.length > 0 && (
                                <ul className={GROUP}>
                                    {groups.map((g: any, i: number) => (
                                        <li key={g.id}>
                                            {i > 0 && <div className={SEPARATOR} />}
                                            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
                                                <Checkbox checked={!!sel[g.id]} onCheckedChange={() => toggle(g)} />
                                                <span className="min-w-0 font-mono text-[15px] [overflow-wrap:anywhere]">
                                                    {g.path || g.name}
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
                    <Button size="form" block disabled={chosen.length === 0} onClick={() => onPick(chosen)}>
                        {t("sxUserDetailXJoinCount", { total: chosen.length })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export function LinkIdpModal({
    userId,
    linked,
    onClose,
    onLinked
}: {
    userId: string;
    linked: string[];
    onClose: () => void;
    onLinked: () => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const providers = useResource(
        () =>
            adminClient.identityProviders
                .find({ first: 0, max: 200, realmOnly: false, capability: "USER_LINKING" })
                .catch(() => adminClient.identityProviders.find())
                .then(asList),
        [adminClient]
    );
    const available = (providers.data || []).filter((p: any) => !linked.includes(p.alias));
    const [alias, setAlias] = useState("");
    const [remoteId, setRemoteId] = useState("");
    const [remoteName, setRemoteName] = useState("");
    const [saving, setSaving] = useState(false);
    const valid = alias && remoteId.trim() && remoteName.trim();

    const save = async () => {
        if (!valid) return;
        setSaving(true);
        try {
            await adminClient.users.addToFederatedIdentity({
                id: userId,
                federatedIdentityId: alias,
                federatedIdentity: { identityProvider: alias, userId: remoteId.trim(), userName: remoteName.trim() }
            });
            addAlert(t("sxUserDetailXIdpLinked"), AlertVariant.success);
            onLinked();
        } catch (e) {
            addError(t("sxUserDetailXIdpLinkError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxUserDetailXLinkIdp")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {providers.status === "loading" && <ListSkeleton rows={2} />}
                    {providers.status === "error" && (
                        <Notice
                            title={t("sxUserDetailXIdpsLoadError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={providers.reload}
                        />
                    )}
                    {providers.status === "ready" && available.length === 0 && (
                        <Notice title={t("sxUserDetailXNoLinkableIdps")} description={t("sxUserDetailXNoLinkableIdpsDescription")} />
                    )}
                    {providers.status === "ready" && available.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <Field size="lg">
                                <FieldLabel htmlFor="link-idp">{t("sxUserDetailXIdentityProvider")}</FieldLabel>
                                <NativeSelect
                                    size="lg"
                                    className="w-full"
                                    id="link-idp"
                                    value={alias}
                                    onChange={(e: any) => setAlias(e.target.value)}
                                >
                                    <NativeSelectOption value="">{t("sxCommonSelectPlaceholder")}</NativeSelectOption>
                                    {available.map((p: any) => (
                                        <NativeSelectOption key={p.alias} value={p.alias}>
                                            {p.displayName || p.alias}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <TextField
                                id="link-idp-user-id"
                                label={t("sxUserDetailXRemoteUserId")}
                                hint={t("sxUserDetailXRemoteUserIdHint")}
                                value={remoteId}
                                onChange={(e: any) => setRemoteId(e.target.value)}
                            />
                            <TextField
                                id="link-idp-username"
                                label={t("sxUserDetailUsername")}
                                hint={t("sxUserDetailXRemoteUsernameHint")}
                                value={remoteName}
                                onChange={(e: any) => setRemoteName(e.target.value)}
                            />
                        </div>
                    )}
                </ModalBody>
                {providers.status === "ready" && available.length > 0 && (
                    <ModalFooter>
                        <Button size="form" block disabled={saving || !valid} onClick={save}>
                            {saving ? t("sxUserDetailXLinking") : t("sxUserDetailXLink")}
                        </Button>
                    </ModalFooter>
                )}
            </ModalContent>
        </Modal>
    );
}
