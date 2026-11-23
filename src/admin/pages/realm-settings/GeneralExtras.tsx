// @ts-nocheck

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { environment } from "../../environment";
import { notifyRealmsChanged } from "../../shell/session";
import { useT } from "../../ui/i18n";
import { GROUP, SEPARATOR, Section, TextAction } from "../../ui/kit";
import { ActionRow, ConfirmDialog, DANGER_BTN, Footnote } from "./fields";

function parseMap(raw: any) {
    if (!raw) return [];
    try {
        const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Object.entries(obj || {}).map(([acr, loa]) => ({ acr, loa: String(loa ?? "") }));
    } catch {
        return [];
    }
}

function serialize(rows: any[]) {
    const obj: Record<string, any> = {};
    rows.forEach(r => {
        const acr = r.acr.trim();
        if (!acr) return;
        const n = Number(r.loa);
        obj[acr] = r.loa !== "" && Number.isFinite(n) ? n : r.loa;
    });
    return JSON.stringify(obj);
}

export function AcrLoaMapping({ value, onChange }: any) {
    const t = useT();
    const [rows, setRows] = useState<any[]>(() => parseMap(value));

    const update = (next: any[]) => {
        setRows(next);
        onChange(serialize(next));
    };
    const setRow = (i: number, k: string, v: string) =>
        update(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

    return (
        <Section
            label={t("sxRealmSettingsAcrLoaMapping")}
            action={
                <TextAction onClick={() => update([...rows, { acr: "", loa: "" }])}>
                    <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
                        <PlusIcon weight="bold" />
                        {t("sxRealmSettingsAcrLoaAdd")}
                    </span>
                </TextAction>
            }
        >
            <div className={GROUP}>
                {rows.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                        <div className="text-base font-semibold">{t("sxRealmSettingsAcrLoaEmptyTitle")}</div>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {t("sxRealmSettingsAcrLoaEmptyDescription")}
                        </p>
                    </div>
                ) : (
                    rows.map((r, i) => (
                        <Fragment key={i}>
                            {i > 0 && <div aria-hidden className={SEPARATOR} />}
                            <div className="flex items-center gap-2 px-4 py-3">
                                <Input
                                    size="lg"
                                    className="min-w-0 flex-[2]"
                                    aria-label={t("sxRealmSettingsAcrLoaAcr")}
                                    placeholder={t("sxRealmSettingsAcrLoaAcr")}
                                    value={r.acr}
                                    onChange={(ev: any) => setRow(i, "acr", ev.target.value)}
                                />
                                <Input
                                    size="lg"
                                    type="number"
                                    className="w-24 min-w-0 flex-1 tabular-nums"
                                    aria-label={t("sxRealmSettingsAcrLoaLevel")}
                                    placeholder={t("sxRealmSettingsAcrLoaLevel")}
                                    value={r.loa}
                                    onChange={(ev: any) => setRow(i, "loa", ev.target.value)}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("sxCommonRemove")}
                                    title={t("sxCommonRemove")}
                                    onClick={() => update(rows.filter((_, j) => j !== i))}
                                    className="shrink-0 text-[#d70015] dark:text-[#ff453a]"
                                >
                                    <TrashIcon />
                                </Button>
                            </div>
                        </Fragment>
                    ))
                )}
            </div>
            <Footnote>{t("sxRealmSettingsAcrLoaHint")}</Footnote>
        </Section>
    );
}

export function DeleteRealmSection({ realm }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const navigate = useNavigate();
    const [confirm, setConfirm] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const master = environment.masterRealm || "master";

    if (realm === master) return null;

    const ask = () =>
        setConfirm({
            title: t("sxRealmSettingsDeleteRealmTitle", { realm }),
            message: t("sxRealmSettingsDeleteRealmMessage"),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                setBusy(true);
                try {
                    await adminClient.realms.del({ realm });
                    notifyRealmsChanged();
                    addAlert(t("sxRealmSettingsDeleteRealmSuccess"), AlertVariant.success);
                    adminClient.setConfig({ realmName: master });
                    navigate(`/${encodeURIComponent(master)}/dashboard`, { replace: true });
                } catch (err) {
                    addError(t("sxRealmSettingsDeleteRealmError"), err);
                    setBusy(false);
                }
            }
        });

    return (
        <Section label={t("sxRealmSettingsDangerZone")}>
            <div className={GROUP}>
                <ActionRow
                    label={t("sxRealmSettingsDeleteRealm")}
                    hint={t("sxRealmSettingsDeleteRealmHint")}
                >
                    <Button className={DANGER_BTN} onClick={ask} disabled={busy}>
                        {busy ? t("sxRealmSettingsDeleting") : t("sxRealmSettingsDeleteRealm")}
                    </Button>
                </ActionRow>
            </div>
            <ConfirmDialog opts={confirm} onClose={() => setConfirm(null)} />
        </Section>
    );
}
