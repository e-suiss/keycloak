// @ts-nocheck

import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useId, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, GROUP, Notice, SEPARATOR, Section } from "../../ui/kit";
import { Card, downloadJson, ErrorNote, FieldItem, ToggleRow } from "./fields";

export function PartialExportModal({ realm, onClose }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [groupsAndRoles, setGroupsAndRoles] = useState(false);
    const [clients, setClients] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            const data = await adminClient.realms.export({
                realm,
                exportClients: clients,
                exportGroupsAndRoles: groupsAndRoles
            });
            downloadJson(data, "realm-export.json");
            addAlert(t("sxRealmSettingsExportSuccess"), AlertVariant.success);
            onClose();
        } catch (err) {
            addError(t("sxRealmSettingsExportError"), err);
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxRealmSettingsPartialExport")}</ModalTitle>
                    <ModalDescription>{t("sxRealmSettingsPartialExportDescription")}</ModalDescription>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                    <Card>
                        <ToggleRow
                            label={t("sxRealmSettingsIncludeGroupsAndRoles")}
                            checked={groupsAndRoles}
                            onChange={setGroupsAndRoles}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsIncludeClients")}
                            checked={clients}
                            onChange={setClients}
                        />
                    </Card>
                    {(groupsAndRoles || clients) && (
                        <div className="rounded-xl border border-[#b25000]/40 bg-[#b25000]/5 px-4 py-3 dark:border-[#ff9f0a]/40 dark:bg-[#ff9f0a]/10">
                            <div className="text-[15px] font-medium text-[#b25000] dark:text-[#ff9f0a]">
                                {t("sxRealmSettingsExportWarningTitle")}
                            </div>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                {t("sxRealmSettingsExportWarningDescription")}
                            </p>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="plain" onClick={onClose}>
                        {t("sxCommonCancel")}
                    </Button>
                    <Button onClick={run} disabled={busy}>
                        {busy ? t("sxRealmSettingsExporting") : t("sxCommonExport")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

const RESOURCES = [
    { key: "users", label: "sxRealmSettingsImportUsers" },
    { key: "groups", label: "sxRealmSettingsImportGroups" },
    { key: "clients", label: "sxRealmSettingsImportClients" },
    { key: "identityProviders", label: "sxRealmSettingsImportIdentityProviders" },
    { key: "realmRoles", label: "sxRealmSettingsImportRealmRoles" },
    { key: "clientRoles", label: "sxRealmSettingsImportClientRoles" }
];

const POLICY_HINTS: Record<string, string> = {
    FAIL: "sxRealmSettingsImportPolicyFailHint",
    SKIP: "sxRealmSettingsImportPolicySkipHint",
    OVERWRITE: "sxRealmSettingsImportPolicyOverwriteHint"
};

const TYPE_LABELS: Record<string, string> = {
    USER: "sxRealmSettingsImportUsers",
    GROUP: "sxRealmSettingsImportGroups",
    CLIENT: "sxRealmSettingsImportClients",
    IDP: "sxRealmSettingsImportIdentityProviders",
    REALM_ROLE: "sxRealmSettingsImportRealmRoles",
    CLIENT_ROLE: "sxRealmSettingsImportClientRoles"
};

function countOf(rep: any, key: string) {
    if (!rep) return 0;
    if (key === "realmRoles") return rep.roles?.realm?.length ?? 0;
    if (key === "clientRoles")
        return Object.values(rep.roles?.client || {}).reduce(
            (n: number, list: any) => n + (Array.isArray(list) ? list.length : 0),
            0
        );
    return Array.isArray(rep[key]) ? rep[key].length : 0;
}

export function PartialImportModal({ realm, onClose, onImported }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addError } = useAlerts();
    const fileRef = useRef<HTMLInputElement>(null);
    const realmSelectId = useId();
    const policyId = useId();
    const [fileName, setFileName] = useState("");
    const [fileError, setFileError] = useState("");
    const [realms, setRealms] = useState<any[] | null>(null);
    const [index, setIndex] = useState(0);
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [policy, setPolicy] = useState("FAIL");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<any>(null);

    const target = realms?.[index];
    const available = RESOURCES.filter(r => countOf(target, r.key) > 0);
    const anyChecked = available.some(r => checked[r.key]);

    const onFile = async (file?: File) => {
        if (!file) return;
        setFileName(file.name);
        setFileError("");
        setChecked({});
        setIndex(0);
        try {
            const parsed = JSON.parse(await file.text());
            const list = Array.isArray(parsed) ? parsed : [parsed];
            if (!list.length || typeof list[0] !== "object") throw new Error("empty");
            setRealms(list);
        } catch {
            setRealms(null);
            setFileError(t("sxRealmSettingsImportInvalidFile"));
        }
    };

    const run = async () => {
        if (!target) return;
        const rep: any = { ifResourceExists: policy, id: target.id, realm: target.realm };
        if (checked.users) rep.users = target.users;
        if (checked.groups) rep.groups = target.groups;
        if (checked.clients) rep.clients = target.clients;
        if (checked.identityProviders) rep.identityProviders = target.identityProviders;
        if (checked.realmRoles || checked.clientRoles) {
            rep.roles = {};
            if (checked.realmRoles) rep.roles.realm = target.roles?.realm;
            if (checked.clientRoles) rep.roles.client = target.roles?.client;
        }
        setBusy(true);
        try {
            const res = await adminClient.realms.partialImport({ realm, rep });
            setResult(res || { added: 0, skipped: 0, overwritten: 0, results: [] });
            onImported?.();
        } catch (err) {
            addError(t("sxRealmSettingsImportError"), err);
        } finally {
            setBusy(false);
        }
    };

    const actionChip = (action: string) =>
        action === "ADDED" ? (
            <Chip tone="success">{t("sxRealmSettingsImportAdded")}</Chip>
        ) : action === "OVERWRITTEN" ? (
            <Chip tone="info">{t("sxRealmSettingsImportOverwritten")}</Chip>
        ) : (
            <Chip tone="warning">{t("sxRealmSettingsImportSkipped")}</Chip>
        );

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxRealmSettingsPartialImport")}</ModalTitle>
                    {!result && (
                        <ModalDescription>{t("sxRealmSettingsPartialImportDescription")}</ModalDescription>
                    )}
                </ModalHeader>
                <ModalBody className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto">
                    {result ? (
                        <>
                            <p className="text-[15px]">
                                {t("sxRealmSettingsImportSummary", {
                                    added: result.added ?? 0,
                                    skipped: result.skipped ?? 0,
                                    overwritten: result.overwritten ?? 0
                                })}
                            </p>
                            {(result.results || []).length === 0 ? (
                                <Notice
                                    title={t("sxRealmSettingsImportNothingTitle")}
                                    description={t("sxRealmSettingsImportNothingDescription")}
                                />
                            ) : (
                                <ul className={GROUP}>
                                    {(result.results || []).map((r: any, i: number) => (
                                        <Fragment key={`${r.resourceType}-${r.id || r.resourceName}-${i}`}>
                                            {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                            <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                                                <div className="min-w-0">
                                                    <div className="truncate text-base font-medium">
                                                        {r.resourceName || r.id}
                                                    </div>
                                                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                                                        {TYPE_LABELS[r.resourceType]
                                                            ? t(TYPE_LABELS[r.resourceType])
                                                            : r.resourceType}
                                                    </div>
                                                </div>
                                                {actionChip(r.action)}
                                            </li>
                                        </Fragment>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="application/json,.json"
                                    className="hidden"
                                    onChange={ev => {
                                        onFile(ev.target.files?.[0]);
                                        ev.target.value = "";
                                    }}
                                />
                                <div className={`${GROUP} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
                                    <span className="min-w-0 truncate text-[15px] text-muted-foreground">
                                        {fileName || t("sxRealmSettingsImportNoFile")}
                                    </span>
                                    <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                                        <UploadSimpleIcon />
                                        {t("sxRealmSettingsImportChooseFile")}
                                    </Button>
                                </div>
                                {fileError && <ErrorNote>{fileError}</ErrorNote>}
                            </div>
                            {realms && (
                                <>
                                    {realms.length > 1 && (
                                        <div className="grid">
                                            <FieldItem label={t("sxRealmSettingsImportSelectRealm")} htmlFor={realmSelectId}>
                                                <NativeSelect
                                                    id={realmSelectId}
                                                    size="lg"
                                                    className="w-full"
                                                    value={String(index)}
                                                    onChange={(ev: any) => {
                                                        setIndex(Number(ev.target.value));
                                                        setChecked({});
                                                    }}
                                                >
                                                    {realms.map((r: any, i: number) => (
                                                        <NativeSelectOption key={i} value={String(i)}>
                                                            {r.realm || r.id || String(i + 1)}
                                                        </NativeSelectOption>
                                                    ))}
                                                </NativeSelect>
                                            </FieldItem>
                                        </div>
                                    )}
                                    <Section label={t("sxRealmSettingsImportChooseResources")}>
                                        {available.length === 0 ? (
                                            <Notice
                                                title={t("sxRealmSettingsImportNoResourcesTitle")}
                                                description={t("sxRealmSettingsImportNoResourcesDescription")}
                                            />
                                        ) : (
                                            <ul className={GROUP}>
                                                {available.map((r, i) => (
                                                    <Fragment key={r.key}>
                                                        {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                                        <li>
                                                            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-black/3 dark:hover:bg-white/4">
                                                                <Checkbox
                                                                    checked={!!checked[r.key]}
                                                                    onCheckedChange={(v: boolean) =>
                                                                        setChecked(p => ({ ...p, [r.key]: !!v }))
                                                                    }
                                                                />
                                                                <span className="min-w-0 flex-1 text-base">{t(r.label)}</span>
                                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                                    {countOf(target, r.key)}
                                                                </span>
                                                            </label>
                                                        </li>
                                                    </Fragment>
                                                ))}
                                            </ul>
                                        )}
                                    </Section>
                                    <div className="grid">
                                        <FieldItem
                                            label={t("sxRealmSettingsImportIfExists")}
                                            htmlFor={policyId}
                                            hint={t(POLICY_HINTS[policy])}
                                        >
                                            <NativeSelect
                                                id={policyId}
                                                size="lg"
                                                className="w-full"
                                                value={policy}
                                                onChange={(ev: any) => setPolicy(ev.target.value)}
                                            >
                                                <NativeSelectOption value="FAIL">
                                                    {t("sxRealmSettingsImportPolicyFail")}
                                                </NativeSelectOption>
                                                <NativeSelectOption value="SKIP">
                                                    {t("sxRealmSettingsImportPolicySkip")}
                                                </NativeSelectOption>
                                                <NativeSelectOption value="OVERWRITE">
                                                    {t("sxRealmSettingsImportPolicyOverwrite")}
                                                </NativeSelectOption>
                                            </NativeSelect>
                                        </FieldItem>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    {result ? (
                        <Button onClick={onClose}>{t("sxCommonClose")}</Button>
                    ) : (
                        <>
                            <Button variant="plain" onClick={onClose}>
                                {t("sxCommonCancel")}
                            </Button>
                            <Button onClick={run} disabled={busy || !target || !anyChecked}>
                                {busy ? t("sxRealmSettingsImporting") : t("sxRealmSettingsImport")}
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
