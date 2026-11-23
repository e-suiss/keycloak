// @ts-nocheck
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
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
import { AdminPage, Chip, Group, ListSkeleton, Notice, Section, TextAction } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const PROVIDER_TYPES = [
    "oidc",
    "keycloak-oidc",
    "saml",
    "google",
    "github",
    "facebook",
    "microsoft",
    "apple"
];

const SOCIAL = new Set(["google", "github", "facebook", "microsoft", "apple"]);

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

export default function IdentityProviders() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [providers, setProviders] = useState<any[]>([]);
    const [addOpen, setAddOpen] = useState(false);

    const [providerId, setProviderId] = useState("oidc");
    const [alias, setAlias] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const list = await adminClient.identityProviders.find();
            setProviders(Array.isArray(list) ? list : []);
            setStatus("ready");
        } catch {
            setStatus("error");
        }
    };

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.identityProviders
            .find()
            .then(list => {
                if (!alive) return;
                setProviders(Array.isArray(list) ? list : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt]);

    const openAdd = () => {
        setProviderId("oidc");
        setAlias("");
        setDisplayName("");
        setAddOpen(true);
    };

    const remove = (idp: any) => {
        confirm({
            title: t("sxIdpsDeleteTitle"),
            message: t("sxIdpsDeleteMessage", { name: idp.displayName || idp.alias }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.del({ alias: idp.alias });
                    addAlert(t("sxIdpsDeleted"), AlertVariant.success);
                    await load();
                } catch (e) {
                    addError(t("sxIdpsDeleteError"), e);
                }
            }
        });
    };

    const submit = async () => {
        const a = alias.trim();
        if (!a) {
            addAlert(t("sxIdpsAliasRequired"), AlertVariant.warning);
            return;
        }
        setSaving(true);
        try {
            await adminClient.identityProviders.create({
                alias: a,
                providerId,
                displayName: displayName.trim() || a,
                enabled: true,
                config: { clientId: "", clientSecret: "" }
            });
            addAlert(t("sxIdpsCreated"), AlertVariant.success);
            if (
                SOCIAL.has(providerId) ||
                providerId === "oidc" ||
                providerId === "saml"
            ) {
                addAlert(
                    t("sxIdpsCredentialsReminder"),
                    AlertVariant.warning
                );
            }
            setAddOpen(false);
            await load();
        } catch (e) {
            addError(t("sxIdpsCreateError"), e);
        } finally {
            setSaving(false);
        }
    };

    const sorted = useMemo(
        () => [...providers].sort((a, b) => (a.alias || "").localeCompare(b.alias || "")),
        [providers]
    );

    return (
        <AdminPage
            title={t("sxNavIdentityProviders")}
            description={t("sxIdpsDescription")}
            actions={<Button onClick={openAdd}>{t("sxIdpsNew")}</Button>}
        >
            <Section label={t("sxIdpsListLabel")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxIdpsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && providers.length === 0 && (
                    <Notice
                        title={t("sxIdpsEmpty")}
                        description={t("sxIdpsEmptyDescription")}
                        action={<Button size="sm" onClick={openAdd}>{t("sxIdpsNew")}</Button>}
                    />
                )}
                {status === "ready" && providers.length > 0 && (
                    <Group>
                        {sorted.map(idp => (
                            <OpenRow
                                key={idp.alias}
                                testId={`idp-${idp.alias}`}
                                onOpen={() => navigate(`/${realm}/identity-providers/${idp.alias}`)}
                                title={idp.displayName || idp.alias}
                                subtitle={
                                    <>
                                        <span className="font-mono">{idp.alias}</span>
                                        {" · "}
                                        {idp.providerId}
                                    </>
                                }
                                trailing={
                                    <>
                                        <span className="hidden sm:inline-flex">
                                            <Chip tone={idp.enabled ? "success" : "neutral"}>
                                                {idp.enabled ? t("sxCommonEnabled") : t("sxCommonDisabled")}
                                            </Chip>
                                        </span>
                                        <TextAction tone="danger" onClick={() => remove(idp)}>
                                            {t("sxCommonDelete")}
                                        </TextAction>
                                    </>
                                }
                            />
                        ))}
                    </Group>
                )}
            </Section>

            <Modal open={addOpen} onOpenChange={o => !o && setAddOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{t("sxIdpsNewTitle")}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>{t("sxCommonType")}</FieldLabel>
                                <NativeSelect
                                    className="w-full"
                                    value={providerId}
                                    onChange={e => setProviderId(e.target.value)}
                                >
                                    {PROVIDER_TYPES.map(type => (
                                        <NativeSelectOption key={type} value={type}>
                                            {type}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <Field>
                                <FieldLabel>
                                    {t("sxCommonAlias")} <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                    value={alias}
                                    onChange={e => setAlias(e.target.value)}
                                    placeholder={t("sxIdpsAliasPlaceholder")}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxCommonDisplayName")}</FieldLabel>
                                <Input
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                />
                                <FieldDescription>
                                    {t("sxIdpsDisplayNameHelp")}
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button type="button" disabled={saving} onClick={submit}>
                            {t("sxCommonAdd")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{confirmOpts?.title}</ConfirmTitle>
                        {confirmOpts?.message && (
                            <ConfirmDescription>{confirmOpts.message}</ConfirmDescription>
                        )}
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? t("sxCommonConfirm")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </AdminPage>
    );
}
