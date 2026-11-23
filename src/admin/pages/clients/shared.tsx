// @ts-nocheck
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
import { type ReactNode, useState } from "react";
import { useT } from "../../ui/i18n";

export const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

export function useConfirmDialog() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<any>(null);
    const confirm = (opts: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        cancelLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
        onCancel?: () => void;
    }) => {
        setState(opts);
        setOpen(true);
    };
    const node = (
        <Confirm
            open={open}
            onOpenChange={(o: boolean) => {
                if (!o && open) state?.onCancel?.();
                setOpen(o);
            }}
        >
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{state?.title}</ConfirmTitle>
                    {state?.message && <ConfirmDescription>{state.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{state?.cancelLabel ?? t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setState((s: any) => ({ ...s, onCancel: undefined }));
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

export function downloadBytes(data: any, filename: string, type = "application/octet-stream") {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

const EXTENSIONS: Record<string, string> = { PKCS12: "p12", JKS: "jks", BCFKS: "bcfks" };
export const keystoreExtension = (format: string) => EXTENSIONS[format] || "keystore";

export const SCOPE_TYPES = ["default", "optional", "none"] as const;
export const SCOPE_TYPE_LABELS: Record<string, string> = {
    default: "sxCommonDefault",
    optional: "sxClientDetailOptional",
    none: "sxClientScopesXTypeNone"
};

export async function loadRealmScopeTypes(adminClient: any) {
    const [def, opt] = await Promise.all([
        adminClient.clientScopes.listDefaultClientScopes(),
        adminClient.clientScopes.listDefaultOptionalClientScopes()
    ]);
    const map: Record<string, string> = {};
    (def || []).forEach((s: any) => (map[s.id] = "default"));
    (opt || []).forEach((s: any) => (map[s.id] = "optional"));
    return map;
}

export async function changeRealmScopeType(adminClient: any, id: string, from: string, to: string) {
    if (from === to) return;
    if (from === "default") await adminClient.clientScopes.delDefaultClientScope({ id });
    else if (from === "optional") await adminClient.clientScopes.delDefaultOptionalClientScope({ id });
    if (to === "default") await adminClient.clientScopes.addDefaultClientScope({ id });
    else if (to === "optional") await adminClient.clientScopes.addDefaultOptionalClientScope({ id });
}

export function configToForm(config: any) {
    const out: any = {};
    Object.entries(config || {}).forEach(([k, v]: any) => {
        if (Array.isArray(v)) out[k] = v.map(String);
        else if (typeof v === "string" && v.includes("##")) out[k] = v.split("##");
        else out[k] = [String(v ?? "")];
    });
    return out;
}

export function formToConfig(form: any) {
    const config: any = {};
    for (const [k, v] of Object.entries(form || {})) {
        config[k] = Array.isArray(v) ? (v.length <= 1 ? (v[0] ?? "") : v.join("##")) : String(v ?? "");
    }
    return config;
}

export const fmtUnix = (seconds: any, locale: string) =>
    seconds
        ? new Date(Number(seconds) * 1000).toLocaleString(locale, { dateStyle: "full", timeStyle: "long" })
        : "";
