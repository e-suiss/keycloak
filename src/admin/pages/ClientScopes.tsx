// @ts-nocheck
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@ui/components/field";
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

/** Confirm dialog — returns a [confirm(opts), node] pair. */
function useConfirmDialog() {
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
                    <ConfirmCancel>Vazgeç</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

export default function ClientScopes() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [loading, setLoading] = useState(true);
    const [scopes, setScopes] = useState<any[]>([]);
    const [_reloadKey, setReloadKey] = useState(0);

    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [protocol, setProtocol] = useState("openid-connect");

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const list = await adminClient.clientScopes.find().catch(() => []);
                if (!alive) return;
                setScopes(list ?? []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient]);

    const reload = () => setReloadKey(k => k + 1);

    const openCreate = () => {
        setName("");
        setDescription("");
        setProtocol("openid-connect");
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.create({
                name: name.trim(),
                description: description.trim() || undefined,
                protocol,
                attributes: {}
            });
            addAlert("Kapsam oluşturuldu.", AlertVariant.success);
            setCreateOpen(false);
            reload();
        } catch (err) {
            addError("Kapsam oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (scope: any) => {
        confirm({
            title: "Kapsamı sil",
            message: `“${scope.name}” kapsamını silmek istediğinize emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clientScopes.del({ id: scope.id });
                    addAlert("Kapsam silindi.", AlertVariant.success);
                    reload();
                } catch (err) {
                    addError("Kapsam silinemedi.", err);
                }
            }
        });
    };

    const sorted = useMemo(
        () => [...scopes].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
        [scopes]
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                <Button onClick={openCreate}>Yeni kapsam</Button>
            </div>
            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ad</TableHead>
                            <TableHead>Açıklama</TableHead>
                            <TableHead>Protokol</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    Kapsam bulunamadı.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sorted.map(s => {
                                const go = () => navigate(`/${realm}/client-scopes/${s.id}`);
                                return (
                                    <TableRow key={s.id}>
                                        <TableCell className="cursor-pointer" onClick={go}>
                                            <span className="font-medium text-foreground">
                                                {s.name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="cursor-pointer" onClick={go}>
                                            {s.description || "—"}
                                        </TableCell>
                                        <TableCell className="cursor-pointer" onClick={go}>
                                            <Badge variant="secondary">
                                                {s.protocol || "openid-connect"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleDelete(s)}
                                            >
                                                Sil
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            )}

            <Modal open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>Yeni kapsam</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>
                                    Ad <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input value={name} onChange={e => setName(e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>Açıklama</FieldLabel>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Protokol</FieldLabel>
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
                        </FieldGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={saving || !name.trim()} onClick={handleCreate}>
                            Oluştur
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {confirmNode}
        </div>
    );
}
