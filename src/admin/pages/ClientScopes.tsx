// @ts-nocheck
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/select";
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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { AdminPage, Chip, Group, ListSkeleton, Notice, SearchField, Section, TextAction } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { changeRealmScopeType, loadRealmScopeTypes, SCOPE_TYPE_LABELS, SCOPE_TYPES } from "./clients/shared";

function useConfirmDialog() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<any>(null);
    const confirm = (opts: any) => {
        setState(opts);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{state?.title}</ConfirmTitle>
                    {state?.message && (
                        <ConfirmDescription>{state.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

function OpenRow({ title, subtitle, onOpen, trailing, testId }: any) {
    return (
        <li
            data-testid={testId}
            className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4"
        >
            <button
                type="button"
                onClick={onOpen}
                className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
            >
                <span className="w-full truncate text-base font-medium">{title}</span>
                {subtitle && (
                    <span className="mt-0.5 w-full text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {subtitle}
                    </span>
                )}
            </button>
            {trailing && <div className="flex shrink-0 items-center gap-3">{trailing}</div>}
        </li>
    );
}

export default function ClientScopes() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [scopes, setScopes] = useState<any[]>([]);
    const [types, setTypes] = useState<Record<string, string>>({});
    const [busyType, setBusyType] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [query, setQuery] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [protocol, setProtocol] = useState("openid-connect");
    const [newType, setNewType] = useState("none");

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        Promise.all([adminClient.clientScopes.find(), loadRealmScopeTypes(adminClient)])
            .then(([list, typeMap]) => {
                if (!alive) return;
                setScopes(Array.isArray(list) ? list : []);
                setTypes(typeMap);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, reloadKey]);

    const reload = () => setReloadKey(k => k + 1);

    const openCreate = () => {
        setName("");
        setDescription("");
        setProtocol("openid-connect");
        setNewType("none");
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const scopeName = name.trim().replace(/ /g, "_");
            const created = await adminClient.clientScopes.create({
                name: scopeName,
                description: description.trim() || undefined,
                protocol,
                attributes: {}
            });
            if (newType !== "none") {
                const newId = created?.id || (await adminClient.clientScopes.findOneByName({ name: scopeName }))?.id;
                if (newId) await changeRealmScopeType(adminClient, newId, "none", newType);
            }
            addAlert(t("sxClientScopesCreated"), AlertVariant.success);
            setCreateOpen(false);
            reload();
        } catch (err) {
            addError(t("sxClientScopesCreateError"), err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (scope: any) => {
        confirm({
            title: t("sxClientScopesDeleteTitle"),
            message: t("sxClientScopesDeleteMessage", { name: scope.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await changeRealmScopeType(adminClient, scope.id, types[scope.id] || "none", "none");
                    await adminClient.clientScopes.del({ id: scope.id });
                    addAlert(t("sxClientScopesDeleted"), AlertVariant.success);
                    reload();
                } catch (err) {
                    addError(t("sxClientScopesDeleteError"), err);
                }
            }
        });
    };

    const changeType = async (scope: any, to: string) => {
        const from = types[scope.id] || "none";
        if (from === to) return;
        setBusyType(scope.id);
        try {
            await changeRealmScopeType(adminClient, scope.id, from, to);
            setTypes(prev => ({ ...prev, [scope.id]: to }));
            addAlert(t("sxClientDetailScopeTypeUpdated"), AlertVariant.success);
        } catch (err) {
            addError(t("sxClientDetailScopeTypeUpdateFailed"), err);
            reload();
        } finally {
            setBusyType(null);
        }
    };

    const sorted = useMemo(
        () => [...scopes].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
        [scopes]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sorted;
        return sorted.filter(
            s => (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q)
        );
    }, [sorted, query]);

    return (
        <AdminPage
            title={t("sxNavClientScopes")}
            description={t("sxClientScopesDescription")}
            actions={<Button onClick={openCreate}>{t("sxClientScopesNew")}</Button>}
        >
            <SearchField value={query} onChange={setQuery} placeholder={t("sxClientScopesSearch")} />

            <Section label={t("sxClientScopesListLabel")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxClientScopesLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={reload}
                    />
                )}
                {status === "ready" && filtered.length === 0 && (
                    <Notice
                        title={query.trim() ? t("sxClientScopesNoMatch") : t("sxClientScopesEmpty")}
                        description={query.trim() ? t("sxCommonTryDifferentSearch") : t("sxClientScopesEmptyDescription")}
                        action={query.trim() ? undefined : <Button size="sm" onClick={openCreate}>{t("sxClientScopesNew")}</Button>}
                    />
                )}
                {status === "ready" && filtered.length > 0 && (
                    <Group>
                        {filtered.map(s => (
                            <OpenRow
                                key={s.id}
                                testId={`scope-${s.name}`}
                                onOpen={() => navigate(`/${realm}/client-scopes/${s.id}`)}
                                title={s.name}
                                subtitle={s.description || "—"}
                                trailing={
                                    <>
                                        <span className="hidden sm:inline-flex">
                                            <Chip>{s.protocol || "openid-connect"}</Chip>
                                        </span>
                                        <Select
                                            value={types[s.id] || "none"}
                                            disabled={busyType === s.id}
                                            onValueChange={(v: string) => changeType(s, v)}
                                        >
                                            <SelectTrigger size="sm" aria-label={t("sxClientScopesXAssignedType")}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent align="end">
                                                {SCOPE_TYPES.map(type => (
                                                    <SelectItem key={type} value={type}>
                                                        {t(SCOPE_TYPE_LABELS[type])}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <TextAction tone="danger" onClick={() => handleDelete(s)}>
                                            {t("sxCommonDelete")}
                                        </TextAction>
                                    </>
                                }
                            />
                        ))}
                    </Group>
                )}
            </Section>

            <Modal open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{t("sxClientScopesNew")}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>
                                    {t("sxCommonName")} <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input value={name} onChange={e => setName(e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxCommonDescription")}</FieldLabel>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxCommonProtocol")}</FieldLabel>
                                <NativeSelect
                                    className="w-full"
                                    value={protocol}
                                    onChange={e => setProtocol(e.target.value)}
                                >
                                    <NativeSelectOption value="openid-connect">
                                        openid-connect
                                    </NativeSelectOption>
                                    <NativeSelectOption value="saml">saml</NativeSelectOption>
                                </NativeSelect>
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxCommonType")}</FieldLabel>
                                <NativeSelect
                                    className="w-full"
                                    value={newType}
                                    onChange={e => setNewType(e.target.value)}
                                >
                                    {SCOPE_TYPES.map(type => (
                                        <NativeSelectOption key={type} value={type}>
                                            {t(SCOPE_TYPE_LABELS[type])}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                                <FieldDescription>{t("sxClientScopesXTypeHelp")}</FieldDescription>
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={saving || !name.trim()} onClick={handleCreate}>
                            {t("sxCommonCreate")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {confirmNode}
        </AdminPage>
    );
}
