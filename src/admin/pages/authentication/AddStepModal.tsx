// @ts-nocheck

import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Spinner } from "@ui/components/spinner";
import { cn } from "@ui/lib/utils";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useMemo, useState } from "react";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Group, ListSkeleton, Notice, SearchField } from "../../ui/kit";

export const isConditionProvider = (p: any) =>
    String(p?.displayName || "").startsWith("Condition ");

export function AddStepModal({
    flowName,
    mode,
    flowProviderId,
    flowId,
    onClose,
    onAdd
}: {
    flowName: string;
    mode: "step" | "condition";
    flowProviderId?: string;
    flowId?: string;
    onClose: () => void;
    onAdd: (provider: any) => Promise<boolean>;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const [providers, setProviders] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [attempt, setAttempt] = useState(0);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        setSelected(null);
        (async () => {
            const am = adminClient.authenticationManagement;
            if (mode === "condition") {
                const list = await am.getAuthenticatorProviders();
                return (list || []).filter(isConditionProvider);
            }
            let providerId = flowProviderId;
            if (!providerId && flowId) {
                const flow = await am.getFlow({ flowId });
                providerId = flow?.providerId;
            }
            if (providerId === "client-flow") return am.getClientAuthenticatorProviders();
            if (providerId === "form-flow") return am.getFormActionProviders();
            const list = await am.getAuthenticatorProviders();
            return (list || []).filter((p: any) => !isConditionProvider(p));
        })()
            .then((list: any) => {
                if (!alive) return;
                setProviders(Array.isArray(list) ? list : []);
                setStatus("ready");
            })
            .catch(() => {
                if (alive) setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [mode, flowProviderId, flowId, attempt]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return [...providers]
            .sort((a, b) =>
                String(a.displayName || a.id).localeCompare(String(b.displayName || b.id))
            )
            .filter(
                p =>
                    !q ||
                    String(p.displayName || p.id).toLowerCase().includes(q) ||
                    String(p.description || "").toLowerCase().includes(q)
            );
    }, [providers, query]);

    const chosen = providers.find(p => p.id === selected);

    const submit = async () => {
        if (!chosen) return;
        setBusy(true);
        const ok = await onAdd(chosen);
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Modal open onOpenChange={o => !o && !busy && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>
                        {mode === "condition"
                            ? t("sxAuthXAddConditionTo", { name: flowName })
                            : t("sxAuthXAddStepTo", { name: flowName })}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <SearchField
                            value={query}
                            onChange={setQuery}
                            placeholder={t("sxAuthXSearchProviders")}
                        />
                        <div className="max-h-[50svh] overflow-y-auto">
                            {status === "loading" ? (
                                <ListSkeleton rows={4} />
                            ) : status === "error" ? (
                                <Notice
                                    title={t("sxAuthXProvidersLoadError")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={() => setAttempt(n => n + 1)}
                                />
                            ) : providers.length === 0 ? (
                                <Notice
                                    title={t("sxAuthXNoProvidersTitle")}
                                    description={t("sxAuthXNoProvidersDescription")}
                                />
                            ) : visible.length === 0 ? (
                                <Notice
                                    title={t("sxAuthXNoProvidersMatch")}
                                    description={t("sxCommonTryDifferentSearch")}
                                />
                            ) : (
                                <Group>
                                    {visible.map(p => {
                                        const isSel = p.id === selected;
                                        return (
                                            <li key={p.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={isSel}
                                                    onClick={() => setSelected(p.id)}
                                                    className={cn(
                                                        "flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-start outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6",
                                                        isSel && "bg-primary/8 dark:bg-primary/15"
                                                    )}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block text-base font-medium [overflow-wrap:anywhere]">
                                                            {p.displayName || p.id}
                                                        </span>
                                                        {p.description && (
                                                            <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                                {p.description}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <CheckIcon
                                                        weight="bold"
                                                        className={cn(
                                                            "size-4 shrink-0 text-primary",
                                                            !isSel && "invisible"
                                                        )}
                                                    />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </Group>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={submit} disabled={!chosen || busy}>
                        {busy && <Spinner data-icon="inline-start" />}
                        {t("sxCommonAdd")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
