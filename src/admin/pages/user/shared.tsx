// @ts-nocheck

import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
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
import { type ReactNode, useEffect, useState } from "react";
import { useAdminClient } from "../../admin-client";
import { i18n } from "../../i18n/i18n";
import { useT } from "../../ui/i18n";
import { GROUP, ListSkeleton, Notice, Row, SEPARATOR } from "../../ui/kit";
import { initials } from "../../ui/util";

export const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

export function useResource(fetcher: () => Promise<any>, deps: any[]) {
    const [state, setState] = useState<{ status: "loading" | "error" | "ready"; data: any }>({
        status: "loading",
        data: null
    });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState(s => (s.status === "ready" ? s : { status: "loading", data: null }));
        fetcher()
            .then(data => alive && setState({ status: "ready", data }))
            .catch(() => alive && setState({ status: "error", data: null }));
        return () => {
            alive = false;
        };
    }, [...deps, attempt]);
    const setData = (updater: any) =>
        setState(s => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
    const reload = () => setAttempt(n => n + 1);
    return { status: state.status, data: state.data, setData, reload };
}

export const asList = (value: any) => (Array.isArray(value) ? value : []);

const toDate = (v: any) => new Date(typeof v === "number" ? v : Number(v) || v);
const locale = () => i18n.language || undefined;
export const formatDate = (v: any) => (v ? toDate(v).toLocaleString(locale()) : "—");

export function formatRelative(v: any) {
    if (!v) return "—";
    const time = toDate(v).getTime();
    const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
    const sec = Math.round((Date.now() - time) / 1000);
    if (sec < 60) return rtf.format(0, "second");
    const min = Math.round(sec / 60);
    if (min < 60) return rtf.format(-min, "minute");
    const hr = Math.round(min / 60);
    if (hr < 24) return rtf.format(-hr, "hour");
    const day = Math.round(hr / 24);
    if (day < 30) return rtf.format(-day, "day");
    return new Date(time).toLocaleDateString(locale());
}

export function Monogram({ name }: { name: string }) {
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
            {initials(name)}
        </span>
    );
}

export function TextField({ id, label, hint, ...props }: any) {
    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input size="lg" id={id} {...props} />
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
        </Field>
    );
}

export function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <Row
            className="min-h-13"
            title={label}
            subtitle={hint}
            trailing={
                <Switch
                    aria-label={typeof label === "string" ? label : undefined}
                    checked={!!checked}
                    disabled={disabled}
                    onCheckedChange={(v: boolean) => onChange(v)}
                />
            }
        />
    );
}

export function SaveBar({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}

export function Footnote({ children }: { children: ReactNode }) {
    return <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}

export function useConfirm() {
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
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

export function ListState({
    status,
    count,
    onRetry,
    errorTitle,
    emptyTitle,
    emptyDescription,
    emptyAction,
    children
}: {
    status: string;
    count: number;
    onRetry: () => void;
    errorTitle: string;
    emptyTitle: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    children: ReactNode;
}) {
    const t = useT();
    if (status === "loading") return <ListSkeleton />;
    if (status === "error")
        return <Notice title={errorTitle} description={t("sxLoadErrorDescription")} onRetry={onRetry} />;
    if (count === 0) return <Notice title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    return <>{children}</>;
}

export function CheckList({
    options,
    value,
    onChange,
    disabled
}: {
    options: { value: string; label: ReactNode; hint?: ReactNode }[];
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
}) {
    const selected = new Set(value || []);
    const toggle = (v: string) => {
        const next = new Set(selected);
        next.has(v) ? next.delete(v) : next.add(v);
        onChange(options.map(o => o.value).filter(o => next.has(o)).concat([...next].filter(x => !options.some(o => o.value === x))));
    };
    return (
        <ul className={GROUP}>
            {options.map((o, i) => (
                <li key={o.value}>
                    {i > 0 && <div className={SEPARATOR} />}
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/3 has-disabled:cursor-default dark:hover:bg-white/4">
                        <Checkbox
                            checked={selected.has(o.value)}
                            disabled={disabled}
                            onCheckedChange={() => toggle(o.value)}
                        />
                        <span className="min-w-0">
                            <span className="block text-[15px] [overflow-wrap:anywhere]">{o.label}</span>
                            {o.hint && (
                                <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                    {o.hint}
                                </span>
                            )}
                        </span>
                    </label>
                </li>
            ))}
        </ul>
    );
}

export function useRequiredActions() {
    const { adminClient } = useAdminClient();
    return useResource(
        () =>
            adminClient.authenticationManagement
                .getRequiredActions()
                .then((list: any) => asList(list).filter((a: any) => a.enabled)),
        [adminClient]
    );
}

export function RequiredActionsPicker({
    value,
    onChange,
    disabled
}: {
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
}) {
    const t = useT();
    const actions = useRequiredActions();
    if (actions.status === "loading") return <ListSkeleton rows={2} />;
    if (actions.status === "error")
        return (
            <Notice
                title={t("sxUserDetailXRequiredActionsLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={actions.reload}
            />
        );
    const list = actions.data || [];
    if (list.length === 0)
        return (
            <Notice
                title={t("sxUserDetailXNoRequiredActions")}
                description={t("sxUserDetailXNoRequiredActionsDescription")}
            />
        );
    return (
        <CheckList
            disabled={disabled}
            value={value}
            onChange={onChange}
            options={list.map((a: any) => ({ value: a.alias, label: a.name || a.alias }))}
        />
    );
}
