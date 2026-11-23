// @ts-nocheck

import { CaretLeftIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { Group, ListSkeleton, Notice, Row, TextAction } from "../../ui/kit";
import { useT } from "../../ui/i18n";

const PAGE = 50;

function parentPath(path: string) {
    const parts = String(path || "").split("/").filter(Boolean);
    parts.pop();
    return parts.length ? `/${parts.join("/")}` : "";
}

export function MoveGroupModal({ group, onClose, onMoved }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [trail, setTrail] = useState<any[]>([]);
    const current = trail[trail.length - 1] ?? null;
    const currentId = current?.id ?? "";
    const [items, setItems] = useState<any[]>([]);
    const [more, setMore] = useState(false);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moving, setMoving] = useState(false);

    const fetchPage = (first: number) =>
        currentId
            ? adminClient.groups.listSubGroups({ parentId: currentId, first, max: PAGE, briefRepresentation: true })
            : adminClient.groups.find({ first, max: PAGE, briefRepresentation: true });

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetchPage(0)
            .then((list: any[]) => {
                if (!alive) return;
                const arr = Array.isArray(list) ? list : [];
                setItems(arr);
                setMore(arr.length === PAGE);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, currentId, attempt]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const list = await fetchPage(items.length);
            const arr = Array.isArray(list) ? list : [];
            setItems(prev => [...prev, ...arr]);
            setMore(arr.length === PAGE);
        } catch (e) {
            addError(t("sxGroupsMoveLoadMoreError"), e);
        } finally {
            setLoadingMore(false);
        }
    };

    const sourceParentPath = parentPath(group.path);
    const currentPath = current?.path ?? "";
    const sameParent = group.path ? sourceParentPath === currentPath : (group.parentId ?? "") === currentId;

    const move = async () => {
        setMoving(true);
        try {
            const { subGroups, ...payload } = group;
            if (current) await adminClient.groups.updateChildGroup({ id: current.id }, payload);
            else await adminClient.groups.updateRoot(payload);
            addAlert(t("sxGroupsMoved"), AlertVariant.success);
            onMoved();
        } catch (e) {
            addError(t("sxGroupsMoveError"), e);
            setMoving(false);
        }
    };

    const visible = items.filter(g => g.id !== group.id);

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxGroupsMoveTitle", { name: group.name })}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <div className="flex min-h-8 min-w-0 items-center gap-2">
                            {current && (
                                <TextAction
                                    onClick={() => setTrail(prev => prev.slice(0, -1))}
                                    aria-label={t("sxGroupsMoveUp")}
                                    className="inline-flex items-center gap-1"
                                >
                                    <CaretLeftIcon className="size-3.5" />
                                    {t("sxGroupsMoveUp")}
                                </TextAction>
                            )}
                            <span className="min-w-0 truncate font-mono text-[13px] text-muted-foreground">
                                {current ? current.path : t("sxGroupsMoveTopLevel")}
                            </span>
                        </div>
                        {status === "loading" ? (
                            <ListSkeleton />
                        ) : status === "error" ? (
                            <Notice
                                title={t("sxGroupsLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        ) : visible.length === 0 ? (
                            <Notice
                                title={t("sxGroupsNoSubgroups")}
                                description={t("sxGroupsMoveEmptyDescription")}
                            />
                        ) : (
                            <>
                                <Group>
                                    {visible.map(g => (
                                        <Row
                                            key={g.id}
                                            onClick={() => setTrail(prev => [...prev, g])}
                                            leading={
                                                <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e] [&_svg]:size-4.5">
                                                    <UsersThreeIcon />
                                                </span>
                                            }
                                            title={g.name}
                                        />
                                    ))}
                                </Group>
                                {more && (
                                    <div className="flex justify-center">
                                        <Button type="button" variant="plain" onClick={loadMore} disabled={loadingMore}>
                                            {t("sxGroupsLoadMore")}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                        <p className="px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                            {sameParent ? t("sxGroupsMoveSameParent") : t("sxGroupsMoveHint")}
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={moving || sameParent} onClick={move}>
                        {current ? t("sxGroupsMoveHere") : t("sxGroupsMoveToTop")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
