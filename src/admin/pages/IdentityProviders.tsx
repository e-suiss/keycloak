// @ts-nocheck
import { ShareNetworkIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@ui/components/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Spinner } from "@ui/components/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@ui/components/table";
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

export default function IdentityProviders() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [loading, setLoading] = useState(true);
    const [providers, setProviders] = useState<any[]>([]);
    const [addOpen, setAddOpen] = useState(false);

    // add-form state
    const [providerId, setProviderId] = useState("oidc");
    const [alias, setAlias] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const list = await adminClient.identityProviders.find().catch(() => []);
            setProviders(Array.isArray(list) ? list : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const list = await adminClient.identityProviders.find().catch(() => []);
                if (!alive) return;
                setProviders(Array.isArray(list) ? list : []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient]);

    const openAdd = () => {
        setProviderId("oidc");
        setAlias("");
        setDisplayName("");
        setAddOpen(true);
    };

    const remove = (idp: any) => {
        confirm({
            title: "Kimlik sağlayıcı silinsin mi?",
            message: `“${idp.displayName || idp.alias}” sağlayıcısı kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.del({ alias: idp.alias });
                    addAlert("Kimlik sağlayıcı silindi.", AlertVariant.success);
                    await load();
                } catch (e) {
                    addError("Kimlik sağlayıcı silinemedi.", e);
                }
            }
        });
    };

    const submit = async () => {
        const a = alias.trim();
        if (!a) {
            addAlert("Alias zorunludur.", AlertVariant.warning);
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
            addAlert("Kimlik sağlayıcı oluşturuldu.", AlertVariant.success);
            if (
                SOCIAL.has(providerId) ||
                providerId === "oidc" ||
                providerId === "saml"
            ) {
                addAlert(
                    "Sağlayıcıyı kullanabilmek için clientId / clientSecret bilgilerini düzenlemeyi unutmayın.",
                    AlertVariant.warning
                );
            }
            setAddOpen(false);
            await load();
        } catch (e) {
            addError("Kimlik sağlayıcı oluşturulamadı.", e);
        } finally {
            setSaving(false);
        }
    };

    const sorted = useMemo(
        () => [...providers].sort((a, b) => (a.alias || "").localeCompare(b.alias || "")),
        [providers]
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                <Button onClick={openAdd}>Yeni sağlayıcı</Button>
            </div>

            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : providers.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShareNetworkIcon />
                        </EmptyMedia>
                        <EmptyTitle>Henüz kimlik sağlayıcı yok.</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sağlayıcı</TableHead>
                            <TableHead>Alias</TableHead>
                            <TableHead>Tür</TableHead>
                            <TableHead>Durum</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.map(idp => (
                            <TableRow key={idp.alias}>
                                <TableCell>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="px-0"
                                        onClick={() =>
                                            navigate(
                                                `/${realm}/identity-providers/${idp.alias}`
                                            )
                                        }
                                    >
                                        {idp.displayName || idp.alias}
                                    </Button>
                                </TableCell>
                                <TableCell className="font-mono">{idp.alias}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{idp.providerId}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-between gap-3">
                                        <Badge
                                            variant={
                                                idp.enabled ? "outline" : "secondary"
                                            }
                                        >
                                            {idp.enabled ? "Etkin" : "Kapalı"}
                                        </Badge>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="xs"
                                            onClick={() => remove(idp)}
                                        >
                                            Sil
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Modal open={addOpen} onOpenChange={o => !o && setAddOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>Yeni kimlik sağlayıcı</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Tür</FieldLabel>
                                <NativeSelect
                                    className="w-full"
                                    value={providerId}
                                    onChange={e => setProviderId(e.target.value)}
                                >
                                    {PROVIDER_TYPES.map(t => (
                                        <NativeSelectOption key={t} value={t}>
                                            {t}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <Field>
                                <FieldLabel>
                                    Alias <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                    value={alias}
                                    onChange={e => setAlias(e.target.value)}
                                    placeholder="örn. google"
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Görünen ad</FieldLabel>
                                <Input
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                />
                                <FieldDescription>
                                    Boş bırakılırsa alias kullanılır.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button type="button" disabled={saving} onClick={submit}>
                            Ekle
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
                        <ConfirmCancel>Vazgeç</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? "Onayla"}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </div>
    );
}
