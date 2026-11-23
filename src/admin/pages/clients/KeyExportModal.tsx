// @ts-nocheck
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { useRealm } from "../../ui/realm";
import { downloadBytes, keystoreExtension } from "./shared";

const FALLBACK_FORMATS = ["JKS", "PKCS12"];

export function useKeystoreFormats() {
    const { adminClient } = useAdminClient();
    const [formats, setFormats] = useState<string[]>(FALLBACK_FORMATS);
    useEffect(() => {
        let alive = true;
        adminClient.serverInfo
            .find()
            .then((si: any) => {
                const list = si?.cryptoInfo?.supportedKeystoreTypes;
                if (alive && Array.isArray(list) && list.length) setFormats(list);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [adminClient]);
    return formats;
}

export function KeystoreFields({ value, onChange, formats, withPem, withKeyPassword = true, withRealmAlias, idPrefix }: any) {
    const t = useT();
    const set = (k: string, v: any) => onChange({ ...value, [k]: v });
    const options = [...formats, ...(withPem ? ["Certificate PEM"] : [])];
    const pem = value.format === "Certificate PEM";
    return (
        <>
            <Field size="lg">
                <FieldLabel htmlFor={`${idPrefix}-format`}>{t("sxClientDetailArchiveFormat")}</FieldLabel>
                <NativeSelect
                    id={`${idPrefix}-format`}
                    size="lg"
                    className="w-full"
                    value={value.format}
                    onChange={(e: any) => set("format", e.target.value)}
                >
                    {options.map(f => (
                        <NativeSelectOption key={f} value={f}>
                            {f}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
                <FieldDescription>{t("sxClientDetailXArchiveFormatHelp")}</FieldDescription>
            </Field>
            {!pem && (
                <>
                    <Field size="lg">
                        <FieldLabel htmlFor={`${idPrefix}-alias`}>{t("sxClientDetailXKeyAlias")}</FieldLabel>
                        <Input
                            size="lg"
                            id={`${idPrefix}-alias`}
                            value={value.keyAlias || ""}
                            aria-invalid={value.touched && !value.keyAlias?.trim() ? true : undefined}
                            onChange={(e: any) => set("keyAlias", e.target.value)}
                        />
                        {value.touched && !value.keyAlias?.trim() && <FieldError>{t("sxClientDetailXRequired")}</FieldError>}
                    </Field>
                    {withKeyPassword && (
                        <Field size="lg">
                            <FieldLabel htmlFor={`${idPrefix}-keypass`}>{t("sxClientDetailXKeyPassword")}</FieldLabel>
                            <Input
                                size="lg"
                                type="password"
                                autoComplete="new-password"
                                id={`${idPrefix}-keypass`}
                                value={value.keyPassword || ""}
                                aria-invalid={value.touched && !value.keyPassword ? true : undefined}
                                onChange={(e: any) => set("keyPassword", e.target.value)}
                            />
                            {value.touched && !value.keyPassword && <FieldError>{t("sxClientDetailXRequired")}</FieldError>}
                        </Field>
                    )}
                    {withRealmAlias && (
                        <Field size="lg">
                            <FieldLabel htmlFor={`${idPrefix}-realmalias`}>{t("sxClientDetailXRealmAlias")}</FieldLabel>
                            <Input
                                size="lg"
                                id={`${idPrefix}-realmalias`}
                                value={value.realmAlias || ""}
                                onChange={(e: any) => set("realmAlias", e.target.value)}
                            />
                            <FieldDescription>{t("sxClientDetailXRealmAliasHelp")}</FieldDescription>
                        </Field>
                    )}
                    <Field size="lg">
                        <FieldLabel htmlFor={`${idPrefix}-storepass`}>{t("sxClientDetailXStorePassword")}</FieldLabel>
                        <Input
                            size="lg"
                            type="password"
                            autoComplete="new-password"
                            id={`${idPrefix}-storepass`}
                            value={value.storePassword || ""}
                            aria-invalid={value.touched && !value.storePassword ? true : undefined}
                            onChange={(e: any) => set("storePassword", e.target.value)}
                        />
                        {value.touched && !value.storePassword && <FieldError>{t("sxClientDetailXRequired")}</FieldError>}
                    </Field>
                </>
            )}
        </>
    );
}

export function keystoreValid(v: any, withKeyPassword = true) {
    if (v.format === "Certificate PEM") return true;
    return !!v.keyAlias?.trim() && !!v.storePassword && (!withKeyPassword || !!v.keyPassword);
}

export default function KeyExportModal({ id, attr, defaultAlias, saml, onClose }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const formats = useKeystoreFormats();
    const [form, setForm] = useState<any>({
        format: "JKS",
        keyAlias: defaultAlias || "",
        keyPassword: "",
        storePassword: "",
        realmAlias: saml ? realm : ""
    });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!formats.includes(form.format)) setForm((f: any) => ({ ...f, format: formats[0] }));
    }, [formats.join(",")]);

    const submit = async () => {
        if (!keystoreValid(form)) {
            setForm((f: any) => ({ ...f, touched: true }));
            return;
        }
        setBusy(true);
        try {
            const config: any = {
                format: form.format,
                keyAlias: form.keyAlias.trim(),
                keyPassword: form.keyPassword,
                storePassword: form.storePassword
            };
            if (saml) {
                config.realmAlias = form.realmAlias?.trim() || undefined;
                config.realmCertificate = !!config.realmAlias;
            }
            const data = await adminClient.clients.downloadKey({ id, attr }, config);
            downloadBytes(data, `keystore.${keystoreExtension(form.format)}`);
            addAlert(t("sxClientDetailXExported"), AlertVariant.success);
            onClose();
        } catch (e) {
            addError(t("sxClientDetailXExportFailed"), e);
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxClientDetailXExportTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    <p className="text-[13px] leading-[1.4] text-muted-foreground">{t("sxClientDetailXExportDescription")}</p>
                    <KeystoreFields value={form} onChange={setForm} formats={formats} withRealmAlias={saml} idPrefix={`export-${attr}`} />
                </ModalBody>
                <ModalFooter>
                    <Button disabled={busy} onClick={submit}>
                        {busy ? t("sxCommonProcessing") : t("sxCommonExport")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
