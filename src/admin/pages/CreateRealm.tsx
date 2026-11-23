// @ts-nocheck
import { FileArrowUpIcon, FileTextIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Switch } from "@ui/components/switch";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { notifyRealmsChanged, useWhoAmI } from "../shell/session";
import { useT } from "../ui/i18n";
import { AdminPage, GROUP, Notice, PageSkeleton, TextAction } from "../ui/kit";
import { useRealm } from "../ui/realm";

export default function CreateRealm() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const { whoAmI, ready } = useWhoAmI();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState("");
    const [enabled, setEnabled] = useState(true);
    const [imported, setImported] = useState<any | null>(null);
    const [fileName, setFileName] = useState("");
    const [fileError, setFileError] = useState("");
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    const back = { label: t("sxRealmsTitle"), to: `/${realm}/realms` };
    const nameError = touched && !name.trim() ? t("sxRealmsNameRequired") : "";

    const handleFile = (file: File) => {
        setFileError("");
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || ""));
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
                setImported(parsed);
                setFileName(file.name);
                if (typeof parsed.realm === "string") setName(parsed.realm);
                if (typeof parsed.enabled === "boolean") setEnabled(parsed.enabled);
            } catch {
                setImported(null);
                setFileName("");
                setFileError(t("sxRealmsFileInvalid"));
            }
        };
        reader.onerror = () => setFileError(t("sxRealmsFileInvalid"));
        reader.readAsText(file);
    };

    const clearFile = () => {
        setImported(null);
        setFileName("");
        setFileError("");
    };

    const create = async () => {
        setTouched(true);
        const realmName = name.trim();
        if (!realmName) return;
        setSaving(true);
        try {
            const { id: _id, ...rest } = imported ?? {};
            await adminClient.realms.create({ ...rest, realm: realmName, enabled });
            addAlert(t("sxRealmsCreated"), AlertVariant.success);
            notifyRealmsChanged();
            navigate(`/${encodeURIComponent(realmName)}/dashboard`);
        } catch (error) {
            addError("sxRealmsCreateError", error);
        } finally {
            setSaving(false);
        }
    };

    if (!ready) return <PageSkeleton />;

    if (!whoAmI?.createRealm) {
        return (
            <AdminPage title={t("sxRealmsCreate")} back={back} width="narrow">
                <Notice title={t("sxRealmsNoCreatePermission")} description={t("sxRealmsNoCreatePermissionDescription")} />
            </AdminPage>
        );
    }

    return (
        <AdminPage title={t("sxRealmsCreate")} description={t("sxRealmsCreateDescription")} back={back} width="narrow">
            <form
                noValidate
                onSubmit={event => {
                    event.preventDefault();
                    create();
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={event => {
                        const file = event.target.files?.[0];
                        if (file) handleFile(file);
                        event.target.value = "";
                    }}
                />
                <div className="flex flex-col gap-4">
                    <Field size="lg" data-invalid={!!fileError || undefined}>
                        <FieldLabel>{t("sxRealmsResourceFile")}</FieldLabel>
                        <div className={`${GROUP} flex min-h-14 items-center gap-3 px-4 py-3`}>
                            {fileName ? (
                                <FileTextIcon className="size-5 shrink-0 text-primary" />
                            ) : (
                                <FileArrowUpIcon className="size-5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-[15px]">
                                {fileName || <span className="text-muted-foreground">{t("sxRealmsNoFile")}</span>}
                            </span>
                            {fileName && (
                                <TextAction tone="danger" onClick={clearFile}>
                                    {t("sxRealmsFileRemove")}
                                </TextAction>
                            )}
                            <TextAction onClick={() => fileInputRef.current?.click()}>
                                {fileName ? t("sxRealmsFileReplace") : t("sxRealmsFileBrowse")}
                            </TextAction>
                        </div>
                        {fileError ? (
                            <FieldError>{fileError}</FieldError>
                        ) : (
                            <FieldDescription>{t("sxRealmsResourceFileHint")}</FieldDescription>
                        )}
                    </Field>
                    <Field size="lg" data-invalid={!!nameError || undefined}>
                        <FieldLabel htmlFor="realm-name">{t("sxRealmsName")}</FieldLabel>
                        <Input
                            id="realm-name"
                            size="lg"
                            autoFocus
                            required
                            aria-invalid={!!nameError || undefined}
                            value={name}
                            onChange={(event: any) => setName(event.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder={t("sxRealmsNamePlaceholder")}
                        />
                        {nameError && <FieldError>{nameError}</FieldError>}
                    </Field>
                    <div className={`${GROUP} flex min-h-14 items-center justify-between gap-4 px-4 py-3`}>
                        <label htmlFor="realm-enabled" className="min-w-0 cursor-pointer">
                            <span className="block text-base">{t("sxCommonEnabled")}</span>
                            <span className="mt-0.5 block text-[13px] text-muted-foreground">{t("sxRealmsEnabledHint")}</span>
                        </label>
                        <Switch id="realm-enabled" checked={enabled} onCheckedChange={(v: boolean) => setEnabled(v)} />
                    </div>
                </div>
                <div className="mt-7 flex flex-col gap-1.5">
                    <Button type="submit" size="form" block disabled={saving}>
                        {saving ? t("sxRealmsCreating") : t("sxCommonCreate")}
                    </Button>
                    <Button type="button" variant="plain" size="form" block onClick={() => navigate(back.to)}>
                        {t("sxCommonCancel")}
                    </Button>
                </div>
            </form>
        </AdminPage>
    );
}
