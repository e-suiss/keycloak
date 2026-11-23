// @ts-nocheck
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { i18n } from "../../i18n/i18n";
import { useT } from "../../ui/i18n";
import { Chip, GROUP, ListSkeleton, Section, SEPARATOR, TextAction } from "../../ui/kit";
import { useRealm } from "../../ui/realm";
import { adminFetch } from "../../ui/util";
import { fmtUnix, useConfirmDialog } from "./shared";

const expired = (seconds: any) => !!seconds && Date.now() >= Number(seconds) * 1000;

export function SecretExpiry({ client }: any) {
    const t = useT();
    const time = client?.attributes?.["client.secret.expiration.time"];
    if (!time) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
            <span className="[overflow-wrap:anywhere]">{t("sxClientDetailXSecretExpiresOn", { time: fmtUnix(time, i18n.language) })}</span>
            {expired(time) && <Chip tone="warning">{t("sxClientDetailXSecretExpired")}</Chip>}
        </div>
    );
}

export function RotatedSecretSection({ id, client, version, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();
    const attrValue = client?.attributes?.["client.secret.rotated"] || "";
    const expiry = client?.attributes?.["client.secret.rotated.expiration.time"];
    const [value, setValue] = useState(attrValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        adminFetch(adminClient, realm, `clients/${encodeURIComponent(id)}/client-secret/rotated`)
            .then((res: any) => {
                if (!alive) return;
                setValue(res && !Array.isArray(res) && res.value ? res.value : attrValue);
            })
            .catch(() => alive && setValue(attrValue))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, id, version, attrValue]);

    const invalidate = () =>
        confirm({
            title: t("sxClientDetailXInvalidateTitle"),
            message: t("sxClientDetailXInvalidateMessage"),
            confirmLabel: t("sxClientDetailXInvalidate"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.invalidateSecret({ id });
                    setValue("");
                    addAlert(t("sxClientDetailXInvalidated"), AlertVariant.success);
                    await reload?.();
                } catch (e) {
                    addError(t("sxClientDetailXInvalidateFailed"), e);
                }
            }
        });

    const copy = () => {
        navigator.clipboard?.writeText(value);
        addAlert(t("sxClientDetailSecretCopied"), AlertVariant.success);
    };

    if (loading && !value) return null;
    if (!value) return confirmNode;

    return (
        <Section label={t("sxClientDetailXRotatedSecret")}>
            {loading ? (
                <ListSkeleton rows={1} />
            ) : (
                <div className={GROUP}>
                    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                        <code className="block min-w-0 font-mono text-sm [overflow-wrap:anywhere]">{value}</code>
                        <TextAction onClick={copy}>{t("sxCommonCopy")}</TextAction>
                    </div>
                    {expiry && (
                        <>
                            <div aria-hidden className={SEPARATOR} />
                            <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
                                <span className="[overflow-wrap:anywhere]">
                                    {t("sxClientDetailXSecretExpiresOn", { time: fmtUnix(expiry, i18n.language) })}
                                </span>
                                {expired(expiry) && <Chip tone="warning">{t("sxClientDetailXSecretExpired")}</Chip>}
                            </div>
                        </>
                    )}
                    <div aria-hidden className={SEPARATOR} />
                    <button
                        type="button"
                        onClick={invalidate}
                        className="flex min-h-12 w-full items-center px-4 py-3 text-left text-[15px] font-medium text-[#d70015] outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:text-[#ff453a] dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                    >
                        {t("sxClientDetailXInvalidate")}
                    </button>
                </div>
            )}
            <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{t("sxClientDetailXRotatedSecretHelp")}</p>
            {confirmNode}
        </Section>
    );
}
