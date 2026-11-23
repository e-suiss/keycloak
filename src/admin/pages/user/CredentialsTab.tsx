// @ts-nocheck

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { GROUP, Group, SEPARATOR, Section, TextAction } from "../../ui/kit";
import { ExecuteActionsModal } from "./modals";
import { ListState, SaveBar, SwitchRow, TextField, asList, formatDate, useConfirm, useResource } from "./shared";

function credentialRows(credential: any): [string, string][] {
    if (!credential?.credentialData) return [];
    try {
        const data = JSON.parse(credential.credentialData);
        return Object.entries(data)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]);
    } catch {
        return [["credentialData", String(credential.credentialData)]];
    }
}

export function CredentialsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const creds = useResource(
        () => adminClient.users.getCredentials({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const [pw, setPw] = useState("");
    const [temp, setTemp] = useState(true);
    const [resetting, setResetting] = useState(false);
    const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
    const [savingLabel, setSavingLabel] = useState(false);
    const [moving, setMoving] = useState(false);
    const [showData, setShowData] = useState<any>(null);
    const [emailOpen, setEmailOpen] = useState(false);

    const reset = async () => {
        if (!pw) return;
        setResetting(true);
        try {
            await adminClient.users.resetPassword({
                id: user.id,
                credential: { type: "password", value: pw, temporary: temp }
            });
            addAlert(t("sxUserDetailPasswordSet"), AlertVariant.success);
            setPw("");
            creds.reload();
        } catch (e) {
            addError(t("sxUserDetailPasswordSetError"), e);
        } finally {
            setResetting(false);
        }
    };

    const del = (c: any) =>
        confirm({
            title: t("sxUserDetailDeleteCredential"),
            message: t("sxUserDetailDeleteCredentialConfirm", { name: c.userLabel || c.type }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.deleteCredential({ id: user.id, credentialId: c.id });
                    addAlert(t("sxCommonDeleted"), AlertVariant.success);
                    creds.setData((list: any[]) => (list || []).filter(x => x.id !== c.id));
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    const saveLabel = async () => {
        if (!editing) return;
        setSavingLabel(true);
        try {
            await adminClient.users.updateCredentialLabel(
                { id: user.id, credentialId: editing.id },
                editing.label.trim()
            );
            addAlert(t("sxUserDetailXLabelSaved"), AlertVariant.success);
            creds.setData((list: any[]) =>
                (list || []).map(x => (x.id === editing.id ? { ...x, userLabel: editing.label.trim() } : x))
            );
            setEditing(null);
        } catch (e) {
            addError(t("sxUserDetailXLabelSaveError"), e);
        } finally {
            setSavingLabel(false);
        }
    };

    const all = creds.data || [];
    const list = all.filter((c: any) => !c.federationLink);
    const federated = all.filter((c: any) => c.federationLink);

    const move = async (index: number, direction: -1 | 1) => {
        const c = list[index];
        const target = index + direction;
        if (!c || target < 0 || target >= list.length) return;
        setMoving(true);
        try {
            if (direction === -1 && target === 0) {
                await adminClient.users.moveCredentialPositionUp({ id: user.id, credentialId: c.id });
            } else {
                const previous = direction === -1 ? list[target - 1] : list[target];
                await adminClient.users.moveCredentialPositionDown({
                    id: user.id,
                    credentialId: c.id,
                    newPreviousCredentialId: previous.id
                });
            }
            addAlert(t("sxUserDetailXCredentialMoved"), AlertVariant.success);
            creds.reload();
        } catch (e) {
            addError(t("sxUserDetailXCredentialMoveError"), e);
        } finally {
            setMoving(false);
        }
    };

    return (
        <>
            <Section label={t("sxUserDetailSetPassword")}>
                <div className="flex flex-col gap-4">
                    <TextField
                        id="user-new-password"
                        label={t("sxUserDetailNewPassword")}
                        type="password"
                        value={pw}
                        onChange={(e: any) => setPw(e.target.value)}
                        placeholder="••••••••"
                    />
                    <Group>
                        <SwitchRow label={t("sxUserDetailTemporaryPassword")} checked={temp} onChange={setTemp} />
                    </Group>
                    <SaveBar>
                        <Button size="form" disabled={!pw || resetting} onClick={reset}>
                            {resetting ? t("sxUserDetailSettingPassword") : t("sxUserDetailSetPasswordButton")}
                        </Button>
                    </SaveBar>
                </div>
            </Section>
            <Section
                label={t("sxUserDetailStoredCredentials")}
                action={
                    <TextAction onClick={() => setEmailOpen(true)} disabled={!user.email}>
                        {t("sxUserDetailXCredentialReset")}
                    </TextAction>
                }
            >
                <ListState
                    status={creds.status}
                    count={list.length + federated.length}
                    onRetry={creds.reload}
                    errorTitle={t("sxUserDetailCredentialsLoadError")}
                    emptyTitle={t("sxUserDetailNoCredentials")}
                    emptyDescription={t("sxUserDetailNoCredentialsDescription")}
                >
                    {list.length > 0 && (
                        <ul className={GROUP}>
                            {list.map((c: any, i: number) => {
                                const isEditing = editing?.id === c.id;
                                const hasData = credentialRows(c).length > 0;
                                return (
                                    <li key={c.id}>
                                        {i > 0 && <div className={SEPARATOR} />}
                                        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            {isEditing ? (
                                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                                                    <Input
                                                        size="md"
                                                        autoFocus
                                                        className="min-w-0 flex-1 basis-48"
                                                        aria-label={t("sxUserDetailXCredentialLabel")}
                                                        placeholder={t("sxUserDetailXCredentialLabel")}
                                                        value={editing.label}
                                                        onChange={(e: any) => setEditing({ id: c.id, label: e.target.value })}
                                                        onKeyDown={(e: any) => {
                                                            if (e.key === "Enter") saveLabel();
                                                            if (e.key === "Escape") setEditing(null);
                                                        }}
                                                    />
                                                    <TextAction disabled={savingLabel} onClick={saveLabel}>
                                                        {t("sxCommonSave")}
                                                    </TextAction>
                                                    <TextAction onClick={() => setEditing(null)}>{t("sxCommonCancel")}</TextAction>
                                                </div>
                                            ) : (
                                                <div className="min-w-0">
                                                    <div className="text-base font-medium [overflow-wrap:anywhere]">
                                                        {c.userLabel || c.type}
                                                    </div>
                                                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                        {c.type}
                                                        {c.createdDate ? ` · ${formatDate(c.createdDate)}` : ""}
                                                    </div>
                                                </div>
                                            )}
                                            {!isEditing && (
                                                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
                                                    {list.length > 1 && (
                                                        <span className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                disabled={moving || i === 0}
                                                                aria-label={t("sxUserDetailXMoveUp")}
                                                                onClick={() => move(i, -1)}
                                                            >
                                                                <ArrowUpIcon />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                disabled={moving || i === list.length - 1}
                                                                aria-label={t("sxUserDetailXMoveDown")}
                                                                onClick={() => move(i, 1)}
                                                            >
                                                                <ArrowDownIcon />
                                                            </Button>
                                                        </span>
                                                    )}
                                                    {hasData && (
                                                        <TextAction onClick={() => setShowData(c)}>
                                                            {t("sxUserDetailXShowData")}
                                                        </TextAction>
                                                    )}
                                                    <TextAction onClick={() => setEditing({ id: c.id, label: c.userLabel || "" })}>
                                                        {t("sxUserDetailXEditLabel")}
                                                    </TextAction>
                                                    <TextAction tone="danger" onClick={() => del(c)}>
                                                        {t("sxCommonDelete")}
                                                    </TextAction>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {federated.length > 0 && (
                        <div className={list.length > 0 ? "mt-4" : undefined}>
                            <Group>
                                {federated.map((c: any) => (
                                    <li key={c.id} className="flex min-h-14 flex-col justify-center px-4 py-3">
                                        <span className="text-base font-medium [overflow-wrap:anywhere]">{c.userLabel || c.type}</span>
                                        <span className="mt-0.5 text-[13px] text-muted-foreground">
                                            {t("sxUserDetailXFederatedCredential")}
                                        </span>
                                    </li>
                                ))}
                            </Group>
                        </div>
                    )}
                </ListState>
            </Section>
            {showData && (
                <Modal open onOpenChange={o => !o && setShowData(null)}>
                    <ModalContent className="sm:max-w-lg">
                        <ModalHeader>
                            <ModalTitle>{showData.userLabel || t("sxUserDetailXCredentialData")}</ModalTitle>
                        </ModalHeader>
                        <ModalBody>
                            <div className="max-h-[60svh] overflow-y-auto">
                                <Group>
                                    {credentialRows(showData).map(([k, v]) => (
                                        <li key={k} className="flex flex-col gap-1 px-4 py-3">
                                            <span className="text-[13px] text-muted-foreground">{k}</span>
                                            <code className="font-mono text-sm [overflow-wrap:anywhere]">{v}</code>
                                        </li>
                                    ))}
                                </Group>
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            )}
            {emailOpen && <ExecuteActionsModal userId={user.id} onClose={() => setEmailOpen(false)} />}
            {confirmNode}
        </>
    );
}
