// @ts-nocheck

import { FlowArrowIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Switch } from "@ui/components/switch";
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
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import yaml from "yaml";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    AdminPage,
    Chip,
    GROUP,
    ListSkeleton,
    Notice,
    SearchField,
    Section,
    SEPARATOR,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { rawWorkflow } from "./workflow-lib";

export default function Workflows() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const navigate = useNavigate();
    const t = useT();

    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [failure, setFailure] = useState<"disabled" | "error" | null>(null);
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setFailure(null);
            const url = `${adminClient.baseUrl}/admin/realms/${realm}/workflows`;
            try {
                const token = await adminClient.getAccessToken();
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
                });
                if (!alive) return;
                if (res.status === 404) {
                    setRows([]);
                    setFailure("disabled");
                    return;
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                let data: any = [];
                if (text.trim()) {
                    try {
                        data = JSON.parse(text);
                    } catch {
                        data = yaml.parse(text);
                    }
                }
                const list = Array.isArray(data) ? data : data?.workflows || [];
                list.sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? ""));
                if (!alive) return;
                setRows(list);
            } catch (err: any) {
                console.error("[workflows] GET failed:", url, err);
                if (!alive) return;
                setFailure("error");
                setRows([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            w =>
                (w.name ?? "").toLowerCase().includes(q) ||
                (w.id ?? "").toLowerCase().includes(q)
        );
    }, [rows, search]);

    const toggleEnabled = async (w: any) => {
        const enabled = !(w.enabled ?? true);
        setBusy(w.id);
        try {
            await rawWorkflow(adminClient, realm, "PUT", w.id, { ...w, enabled });
            setRows(rs => rs.map(r => (r.id === w.id ? { ...r, enabled } : r)));
            addAlert(
                enabled ? t("sxWorkflowsEnabledToast") : t("sxWorkflowsDisabledToast"),
                AlertVariant.success
            );
        } catch (err: any) {
            addError(t("sxWorkflowsUpdateError", { error: err?.message || err }), err);
        } finally {
            setBusy(null);
        }
    };

    const remove = (w: any) =>
        confirm({
            title: t("sxWorkflowsDeleteTitle"),
            message: w.name
                ? t("sxWorkflowsDeleteMessage", { name: w.name })
                : t("sxWorkflowsDeleteMessageUnnamed"),
            confirmLabel: t("sxWorkflowsDelete"),
            danger: true,
            onConfirm: async () => {
                setBusy(w.id);
                try {
                    await rawWorkflow(adminClient, realm, "DELETE", w.id);
                    setRows(rs => rs.filter(r => r.id !== w.id));
                    addAlert(t("sxWorkflowsDeleted"), AlertVariant.success);
                } catch (err: any) {
                    addError(t("sxWorkflowsDeleteError", { error: err?.message || err }), err);
                } finally {
                    setBusy(null);
                }
            }
        });

    const ready = !loading && !failure;
    const createButton = (
        <Button onClick={() => navigate(`/${realm}/workflows/new`)}>{t("sxWorkflowsCreate")}</Button>
    );

    return (
        <AdminPage
            title={t("sxWorkflowsTitle")}
            description={t("sxWorkflowsDescription")}
            actions={ready && createButton}
        >
            {ready && rows.length > 0 && (
                <SearchField
                    value={search}
                    onChange={setSearch}
                    placeholder={t("sxWorkflowsSearchPlaceholder")}
                />
            )}

            <Section
                label={
                    ready && filtered.length > 0
                        ? t("sxWorkflowsCount", { n: filtered.length })
                        : t("sxWorkflowsSection")
                }
            >
                {loading ? (
                    <ListSkeleton />
                ) : failure === "disabled" ? (
                    <Notice
                        title={t("sxWorkflowsFeatureDisabledTitle")}
                        description={t("sxWorkflowsFeatureDisabledDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                ) : failure === "error" ? (
                    <Notice
                        title={t("sxWorkflowsLoadErrorTitle")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                ) : rows.length === 0 ? (
                    <Notice
                        title={t("sxWorkflowsEmptyTitle")}
                        description={t("sxWorkflowsEmptyDescription")}
                        action={createButton}
                    />
                ) : filtered.length === 0 ? (
                    <Notice
                        title={t("sxWorkflowsNoResultsTitle")}
                        description={t("sxWorkflowsNoResultsDescription")}
                    />
                ) : (
                    <ul className={GROUP}>
                        {filtered.map((w, i) => (
                            <Fragment key={w.id}>
                                {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                <WorkflowRow
                                    w={w}
                                    busy={busy === w.id}
                                    onToggle={() => toggleEnabled(w)}
                                    onOpen={() => navigate(`/${realm}/workflows/${w.id}`)}
                                    onCopy={() => navigate(`/${realm}/workflows/copy/${w.id}`)}
                                    onDelete={() => remove(w)}
                                />
                            </Fragment>
                        ))}
                    </ul>
                )}
            </Section>
            {confirmNode}
        </AdminPage>
    );
}

function WorkflowRow({ w, busy, onToggle, onOpen, onCopy, onDelete }: any) {
    const t = useT();
    const enabled = w.enabled ?? true;
    const stepCount = (w.steps || []).length;
    return (
        <li className="flex min-h-16 items-stretch">
            <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
            >
                <span className="grid size-10 shrink-0 place-items-center">
                    <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-white dark:bg-[#48484a]">
                        <FlowArrowIcon className="size-4" />
                    </span>
                </span>
                <div className="min-w-0">
                    <div className="truncate text-base font-medium">{w.name || t("sxWorkflowsUnnamed")}</div>
                    <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {t("sxWorkflowsStepCount", { n: stepCount })}
                        {w.id && (
                            <>
                                {" "}
                                · <span className="font-mono">{w.id.slice(0, 8)}</span>
                            </>
                        )}
                    </div>
                </div>
            </button>
            <div className="flex shrink-0 items-center gap-3 pe-4">
                <span className="hidden sm:inline-flex">
                    <Chip tone={enabled ? "success" : "neutral"}>{enabled ? t("sxWorkflowsStatusEnabled") : t("sxWorkflowsStatusInactive")}</Chip>
                </span>
                <Switch
                    checked={enabled}
                    disabled={busy}
                    onCheckedChange={onToggle}
                    aria-label={enabled ? t("sxWorkflowsStatusEnabled") : t("sxWorkflowsStatusInactive")}
                />
                <TextAction onClick={onCopy}>{t("sxWorkflowsDuplicate")}</TextAction>
                <TextAction tone="danger" onClick={onDelete}>
                    {t("sxWorkflowsDelete")}
                </TextAction>
            </div>
        </li>
    );
}

function useConfirm() {
    const t = useT();
    const [opts, setOpts] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const confirm = (o: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setOpts(o);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && (
                        <ConfirmDescription>{opts.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxWorkflowsCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? t("sxWorkflowsConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}
