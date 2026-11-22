// @ts-nocheck

import { CaretLeftIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Spinner } from "@ui/components/spinner";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import yaml from "yaml";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import {
    rawWorkflow,
    STARTER,
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

    const isCopy = pathname.includes("/workflows/copy/");
    const isNew = !id; // /workflows/new
    const isUpdate = !!id && !isCopy;

    const [draft, setDraft] = useState("");
    const [errors, setErrors] = useState<any[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        if (isNew) {
            setDraft(STARTER);
            setLoading(false);
            return;
        }
        let alive = true;
        (async () => {
            setLoading(true);
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
                if (alive) addError("Workflow yüklenemedi.", err);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, id, isNew, isCopy, addError]);

    const back = () => navigate(`/${realm}/workflows`);

    const save = async () => {
        if (errors.length) {
            addAlert(
                `Düzeltilmesi gereken ${errors.length} hata var.`,
                AlertVariant.danger
            );
            return;
        }
        let parsed: any;
        try {
            parsed = yaml.parse(draft);
        } catch (err) {
            addError("YAML çözümlenemedi.", err);
            return;
        }
        if (!parsed?.name) {
            addAlert("Workflow için bir ad gereklidir.", AlertVariant.danger);
            return;
        }
        setSaving(true);
        try {
            if (isUpdate) {
                await rawWorkflow(adminClient, realm, "PUT", id, parsed);
                addAlert("Workflow kaydedildi.", AlertVariant.success);
            } else {
                await rawWorkflow(adminClient, realm, "POST", undefined, draft);
                addAlert("Workflow oluşturuldu.", AlertVariant.success);
            }
            back();
        } catch (err: any) {
            addError(`Workflow kaydedilemedi: ${err?.message || err}`, err);
        } finally {
            setSaving(false);
        }
    };

    const title = isUpdate
        ? "Workflow'u düzenle"
        : isCopy
          ? "Workflow'u çoğalt"
          : "Yeni workflow";

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="relative mb-7 flex items-center">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={back}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" className="rtl:rotate-180" />
                </Button>
                <p className="absolute left-1/2 -translate-x-1/2 font-semibold">
                    {title}
                </p>
                <div className="ms-auto">
                    <Button
                        disabled={saving || loading || errors.length > 0}
                        onClick={save}
                    >
                        {saving ? "Kaydediliyor…" : isUpdate ? "Kaydet" : "Oluştur"}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : missing ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                    Workflow bulunamadı.
                </p>
            ) : (
                <div className="mx-auto max-w-2xl space-y-4">
                    {errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTitle>
                                Kaydetmeden önce düzelt ({errors.length})
                            </AlertTitle>
                            <AlertDescription>
                                <ul className="space-y-1">
                                    {errors.map((e, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <span className="shrink-0 font-medium text-destructive">
                                                {e.where}:
                                            </span>
                                            <span className="text-muted-foreground">
                                                {e.msg}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                    <WorkflowEditor
                        draft={draft}
                        setDraft={setDraft}
                        palette={palette}
                        onErrors={setErrors}
                    />
                </div>
            )}
        </div>
    );
}
