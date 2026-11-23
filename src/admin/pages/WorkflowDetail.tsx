// @ts-nocheck

import { Button } from "@ui/components/button";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import yaml from "yaml";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { AdminPage, ListSkeleton, Notice } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import {
    rawWorkflow,
    STARTER,
    issueText,
    stripIds,
    usePalette,
    WorkflowEditor
} from "./workflow-lib";

export default function WorkflowDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const palette = usePalette();
    const t = useT();

    const isCopy = pathname.includes("/workflows/copy/");
    const isNew = !id;
    const isUpdate = !!id && !isCopy;

    const [draft, setDraft] = useState("");
    const [errors, setErrors] = useState<any[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [missing, setMissing] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (isNew) {
            setDraft(STARTER);
            setLoading(false);
            return;
        }
        let alive = true;
        (async () => {
            setLoading(true);
            setLoadFailed(false);
            setMissing(false);
            try {
                const w = await rawWorkflow(adminClient, realm, "GET", id);
                if (!alive) return;
                if (!w) {
                    setMissing(true);
                    return;
                }
                const base = stripIds(w);
                if (isCopy) base.name = `${w.name ?? "workflow"} -- Copy`;
                setDraft(yaml.stringify(base));
            } catch (err) {
                console.error("[workflows] load failed:", err);
                if (alive) setLoadFailed(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, id, isNew, isCopy, attempt]);

    const back = () => navigate(`/${realm}/workflows`);

    const save = async () => {
        if (errors.length) {
            addAlert(t("sxWorkflowDetailErrorsToFix", { n: errors.length }), AlertVariant.danger);
            return;
        }
        let parsed: any;
        try {
            parsed = yaml.parse(draft);
        } catch (err) {
            addError(t("sxWorkflowDetailYamlParseError"), err);
            return;
        }
        if (!parsed?.name) {
            addAlert(t("sxWorkflowDetailNameRequired"), AlertVariant.danger);
            return;
        }
        setSaving(true);
        try {
            if (isUpdate) {
                await rawWorkflow(adminClient, realm, "PUT", id, parsed);
                addAlert(t("sxWorkflowDetailSaved"), AlertVariant.success);
            } else {
                await rawWorkflow(adminClient, realm, "POST", undefined, draft);
                addAlert(t("sxWorkflowDetailCreated"), AlertVariant.success);
            }
            back();
        } catch (err: any) {
            addError(t("sxWorkflowDetailSaveError", { error: err?.message || err }), err);
        } finally {
            setSaving(false);
        }
    };

    const title = isUpdate
        ? t("sxWorkflowDetailEditTitle")
        : isCopy
          ? t("sxWorkflowDetailCopyTitle")
          : t("sxWorkflowDetailNewTitle");
    const submitLabel = saving
        ? t("sxWorkflowDetailSaving")
        : isUpdate
          ? t("sxWorkflowDetailSave")
          : t("sxWorkflowDetailCreate");

    return (
        <AdminPage
            title={title}
            width="wide"
            back={{ label: t("sxWorkflowsTitle"), to: `/${realm}/workflows` }}
            actions={
                !loading &&
                !missing &&
                !loadFailed && (
                    <Button disabled={saving || errors.length > 0} onClick={save}>
                        {submitLabel}
                    </Button>
                )
            }
        >
            {loading ? (
                <ListSkeleton rows={4} />
            ) : loadFailed ? (
                <Notice
                    title={t("sxWorkflowDetailLoadErrorTitle")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            ) : missing ? (
                <Notice
                    title={t("sxWorkflowDetailNotFoundTitle")}
                    description={t("sxWorkflowDetailNotFoundDescription")}
                    action={
                        <Button size="sm" variant="plain" onClick={back}>
                            {t("sxWorkflowDetailBackToList")}
                        </Button>
                    }
                />
            ) : (
                <>
                    {errors.length > 0 && (
                        <div
                            role="alert"
                            className="rounded-xl border border-[#d70015]/40 bg-[#d70015]/5 px-4 py-3.5 dark:border-[#ff453a]/40 dark:bg-[#ff453a]/10"
                        >
                            <div className="text-[15px] font-semibold text-[#d70015] dark:text-[#ff453a]">
                                {t("sxWorkflowDetailErrorsHeading", { n: errors.length })}
                            </div>
                            <ul className="mt-2 flex flex-col gap-1">
                                {errors.map((e, i) => {
                                    const issue = issueText(t, e);
                                    return (
                                        <li key={i} className="flex flex-wrap gap-x-2 text-sm">
                                            <span className="shrink-0 font-medium text-[#d70015] dark:text-[#ff453a]">
                                                {issue.where}:
                                            </span>
                                            <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
                                                {issue.msg}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                    <WorkflowEditor
                        draft={draft}
                        setDraft={setDraft}
                        palette={palette}
                        onErrors={setErrors}
                    />
                    <div className="flex justify-end">
                        <Button
                            size="form"
                            disabled={saving || errors.length > 0}
                            onClick={save}
                        >
                            {submitLabel}
                        </Button>
                    </div>
                </>
            )}
        </AdminPage>
    );
}
