// @ts-nocheck

import {
    CaretRightIcon,
    DotsThreeIcon,
    FolderPlusIcon,
    StarIcon,
    TrashIcon,
    UsersIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import { cn } from "@ui/lib/utils";
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
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";

export default function Groups() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const navigate = useNavigate();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [loading, setLoading] = useState(true);
    const [roots, setRoots] = useState<any[]>([]);
    const [defaults, setDefaults] = useState<Set<string>>(new Set());
    const [_reloadKey, setReloadKey] = useState(0);
    const reload = () => setReloadKey(k => k + 1);

    const [createParent, setCreateParent] = useState<any>(undefined); // undefined=closed, null=root, group=child
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const [list, def] = await Promise.all([
                    adminClient.groups
                        .find({ briefRepresentation: false })
                        .catch(() => []),
                    adminClient.realms.getDefaultGroups({ realm }).catch(() => [])
                ]);
                if (!alive) return;
                setRoots(sortGroups(list));
                setDefaults(new Set((def || []).map((g: any) => g.id)));
            } catch (e) {
                if (alive) addError("Gruplar yüklenemedi.", e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, addError]);

    const openCreate = (parent: any) => {
        setNewName("");
        setCreateParent(parent ?? null);
    };
    const create = async () => {
        const name = newName.trim();
        if (!name) return;
        setCreating(true);
        try {
            if (createParent)
                await adminClient.groups.createChildGroup(
                    { id: createParent.id },
                    { name }
                );
            else await adminClient.groups.create({ name });
            addAlert("Grup oluşturuldu.", AlertVariant.success);
            setCreateParent(undefined);
            reload();
        } catch (e) {
            addError("Grup oluşturulamadı.", e);
        } finally {
            setCreating(false);
        }
    };

    const remove = (g: any) =>
        confirm({
            title: "Grubu sil",
            message: `“${g.name}” ve tüm alt grupları silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.groups.del({ id: g.id });
                    addAlert("Grup silindi.", AlertVariant.success);
                    reload();
                } catch (e) {
                    addError("Grup silinemedi.", e);
                }
            }
        });

    const toggleDefault = async (g: any) => {
        const isDef = defaults.has(g.id);
        try {
            if (isDef) await adminClient.realms.removeDefaultGroup({ realm, id: g.id });
            else await adminClient.realms.addDefaultGroup({ realm, id: g.id });
            addAlert(
                isDef ? "Varsayılan gruptan çıkarıldı." : "Varsayılan grup yapıldı.",
                AlertVariant.success
            );
            setDefaults(prev => {
                const next = new Set(prev);
                isDef ? next.delete(g.id) : next.add(g.id);
                return next;
            });
        } catch (e) {
            addError("Güncellenemedi.", e);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                <Button onClick={() => openCreate(null)}>Yeni grup</Button>
            </div>
            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : roots.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UsersThreeIcon />
                        </EmptyMedia>
                        <EmptyTitle>Henüz grup yok</EmptyTitle>
                        <EmptyDescription>
                            Kullanıcıları düzenlemek ve toplu rol atamak için ilk grubunu
                            oluştur.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => openCreate(null)}>Yeni grup</Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <ItemGroup variant="inset">
                    {roots.map((g, i) => (
                        <Fragment key={g.id}>
                            {i > 0 && <ItemSeparator />}
                            <TreeNode
                                group={g}
                                depth={0}
                                defaults={defaults}
                                onOpen={id => navigate(`/${realm}/groups/${id}`)}
                                onAddChild={openCreate}
                                onDelete={remove}
                                onToggleDefault={toggleDefault}
                            />
                        </Fragment>
                    ))}
                </ItemGroup>
            )}

            <Modal
                open={createParent !== undefined}
                onOpenChange={o => !o && setCreateParent(undefined)}
            >
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>
                            {createParent
                                ? `“${createParent.name}” içine alt grup`
                                : "Yeni grup"}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <Field>
                            <FieldLabel htmlFor="group-create-name">
                                Grup adı <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="group-create-name"
                                autoFocus
                                value={newName}
                                placeholder="örn. Yöneticiler"
                                onChange={(e: any) => setNewName(e.target.value)}
                                onKeyDown={(e: any) => e.key === "Enter" && create()}
                            />
                        </Field>
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={creating || !newName.trim()} onClick={create}>
                            Oluştur
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <Confirm
                open={!!confirmOpts}
                onOpenChange={o => !o && setConfirmOpts(null)}
            >
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

function sortGroups(list: any[]) {
    return [...(list ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function TreeNode({
    group,
    depth,
    defaults,
    onOpen,
    onAddChild,
    onDelete,
    onToggleDefault
}: any) {
    const { adminClient } = useAdminClient();
    const [open, setOpen] = useState(false);
    const [children, setChildren] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const hasChildren = (group.subGroupCount ?? group.subGroups?.length ?? 0) > 0;
    const isDefault = defaults.has(group.id);

    const expand = useCallback(async () => {
        if (open) {
            setOpen(false);
            return;
        }
        setOpen(true);
        if (children === null) {
            setLoading(true);
            try {
                const subs = await adminClient.groups.listSubGroups({
                    parentId: group.id,
                    briefRepresentation: false
                });
                setChildren(sortGroups(subs));
            } catch {
                setChildren([]);
            } finally {
                setLoading(false);
            }
        }
    }, [open, children, adminClient, group.id]);

    return (
        <>
            <Item size="sm" style={{ paddingInlineStart: 12 + depth * 22 }}>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={expand}
                    aria-label={open ? "Daralt" : "Genişlet"}
                    className={cn(!hasChildren && "invisible")}
                >
                    <CaretRightIcon
                        className={cn("transition-transform", open && "rotate-90")}
                        weight="bold"
                    />
                </Button>
                <ItemMedia variant="icon">
                    <UsersThreeIcon />
                </ItemMedia>
                <ItemContent className="min-w-0">
                    <ItemTitle>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto px-0"
                            onClick={() => onOpen(group.id)}
                        >
                            <span className="truncate">{group.name}</span>
                        </Button>
                    </ItemTitle>
                </ItemContent>
                <ItemActions>
                    {isDefault && (
                        <Badge variant="outline">
                            <StarIcon weight="fill" data-icon="inline-start" /> Varsayılan
                        </Badge>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Eylemler"
                            >
                                <DotsThreeIcon weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpen(group.id)}>
                                <UsersIcon /> Aç
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddChild(group)}>
                                <FolderPlusIcon /> Alt grup ekle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleDefault(group)}>
                                <StarIcon />{" "}
                                {isDefault ? "Varsayılandan çıkar" : "Varsayılan yap"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDelete(group)}
                            >
                                <TrashIcon /> Sil
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ItemActions>
            </Item>
            {open &&
                (loading ? (
                    <>
                        <ItemSeparator />
                        <Item
                            size="sm"
                            style={{ paddingInlineStart: 12 + (depth + 1) * 22 }}
                        >
                            <Spinner />
                        </Item>
                    </>
                ) : children && children.length > 0 ? (
                    children.map(c => (
                        <Fragment key={c.id}>
                            <ItemSeparator />
                            <TreeNode
                                group={c}
                                depth={depth + 1}
                                defaults={defaults}
                                onOpen={onOpen}
                                onAddChild={onAddChild}
                                onDelete={onDelete}
                                onToggleDefault={onToggleDefault}
                            />
                        </Fragment>
                    ))
                ) : (
                    <>
                        <ItemSeparator />
                        <Item
                            size="sm"
                            style={{ paddingInlineStart: 12 + (depth + 1) * 22 }}
                        >
                            <ItemContent>
                                <ItemDescription>Alt grup yok.</ItemDescription>
                            </ItemContent>
                        </Item>
                    </>
                ))}
        </>
    );
}
