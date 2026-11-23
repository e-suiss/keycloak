// @ts-nocheck
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
import { Switch } from "@ui/components/switch";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { GROUP, ListSkeleton, Notice, Section, SEPARATOR, SegmentTabs, TextAction } from "../../ui/kit";
import KeyExportModal, { KeystoreFields, keystoreValid, useKeystoreFormats } from "./KeyExportModal";
import { downloadBytes, useConfirmDialog } from "./shared";

const KEYS = [
    {
        attr: "saml.signing",
        flag: "saml.client.signature",
        title: "sxClientDetailXSamlSigningTitle",
        explain: "sxClientDetailXSamlSigningExplain",
        label: "sxClientDetailXClientSignature",
        related: []
    },
    {
        attr: "saml.encryption",
        flag: "saml.encrypt",
        title: "sxClientDetailXSamlEncryptionTitle",
        explain: "sxClientDetailXSamlEncryptionExplain",
        label: "sxClientDetailXEncryptAssertions",
        related: [
            "saml.encryption.algorithm",
            "saml.encryption.keyAlgorithm",
            "saml.encryption.digestMethod",
            "saml.encryption.maskGenerationFunction"
        ]
    }
];

async function uploadKeyForm(adminClient: any, id: string, attr: string, form: any, file: File) {
    const data = new FormData();
    data.append("keystoreFormat", form.format);
    if (form.format !== "Certificate PEM") {
        data.append("keyAlias", form.keyAlias.trim());
        data.append("storePassword", form.storePassword);
    }
    data.append("file", file);
    await adminClient.clients.uploadKey({ id, attr }, data);
}

function FilePicker({ file, onFile, id }: any) {
    const t = useT();
    const ref = useRef<HTMLInputElement>(null);
    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>{t("sxClientDetailXImportFile")}</FieldLabel>
            <input
                ref={ref}
                id={id}
                type="file"
                className="hidden"
                onChange={(e: any) => {
                    onFile(e.target.files?.[0] || null);
                    if (ref.current) ref.current.value = "";
                }}
            />
            <div className="flex min-w-0 items-center gap-3">
                <Button variant="secondary" onClick={() => ref.current?.click()}>
                    {t("sxClientDetailXChooseFile")}
                </Button>
                <span className="min-w-0 truncate text-[15px] text-muted-foreground">{file?.name || t("sxClientDetailXNoFile")}</span>
            </div>
        </Field>
    );
}

function CertBlock({ cert, onCopy }: any) {
    const t = useT();
    return (
        <div className="flex flex-col gap-3 px-4 py-3">
            <div className="text-[13px] text-muted-foreground">{t("sxClientDetailXCertificate")}</div>
            <code className="block max-h-32 overflow-y-auto font-mono text-xs break-all text-muted-foreground">{cert}</code>
            <TextAction className="self-start" onClick={onCopy}>
                {t("sxCommonCopy")}
            </TextAction>
        </div>
    );
}

function ActionLine({ onClick, children, danger }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                "flex min-h-12 w-full items-center px-4 py-3 text-left text-[15px] font-medium outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6 " +
                (danger ? "text-[#d70015] dark:text-[#ff453a]" : "text-primary")
            }
        >
            {children}
        </button>
    );
}

export default function SamlKeys({ id, client, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [info, setInfo] = useState<Record<string, any>>({});
    const [attempt, setAttempt] = useState(0);
    const [enabling, setEnabling] = useState<any>(null);
    const [importing, setImporting] = useState<any>(null);
    const [exporting, setExporting] = useState<any>(null);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        Promise.all(KEYS.map(k => adminClient.clients.getKeyInfo({ id, attr: k.attr })))
            .then(list => {
                if (!alive) return;
                const next: any = {};
                KEYS.forEach((k, i) => (next[k.attr] = list[i] || {}));
                setInfo(next);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, id, attempt]);

    const refresh = () => setAttempt(n => n + 1);
    const attrs = client?.attributes || {};
    const useMetadata = attrs["saml.useMetadataDescriptorUrl"] === "true";

    const saveFlag = async (k: any, on: boolean) => {
        try {
            const next = { ...attrs, [k.flag]: on ? "true" : "false" };
            k.related.forEach((r: string) => (next[r] = ""));
            await adminClient.clients.update({ id }, { ...client, attributes: next });
            addAlert(t("sxClientDetailSaved"), AlertVariant.success);
            await reload();
            refresh();
        } catch (e) {
            addError(t("sxClientDetailSaveFailed"), e);
        }
    };

    const generate = async (k: any) => {
        try {
            const res = await adminClient.clients.generateKey({ id, attr: k.attr });
            if (res?.privateKey) downloadBytes(res.privateKey, "private.key");
            addAlert(t("sxClientDetailKeyGenerated"), AlertVariant.success);
            refresh();
        } catch (e) {
            addError(t("sxClientDetailKeyGenerateFailed"), e);
        }
    };

    const onToggle = (k: any, on: boolean) => {
        const name = t(k.label);
        if (on) {
            if (useMetadata) saveFlag(k, true);
            else setEnabling(k);
            return;
        }
        confirm({
            title: t("sxClientDetailXDisableKeyTitle", { key: name }),
            message: t("sxClientDetailXDisableKeyMessage", { key: name }),
            confirmLabel: t("sxCommonDisable"),
            danger: true,
            onConfirm: () => saveFlag(k, false)
        });
    };

    const regenerate = (k: any) =>
        confirm({
            title: t("sxClientDetailXRegenerateKeyTitle", { key: t(k.label) }),
            message: t("sxClientDetailXRegenerateKeyMessage"),
            confirmLabel: t("sxClientDetailRegenerate"),
            danger: true,
            onConfirm: () => generate(k)
        });

    const copy = (cert: string) => {
        navigator.clipboard?.writeText(cert);
        addAlert(t("sxClientDetailCertCopied"), AlertVariant.success);
    };

    if (status === "loading") return <ListSkeleton rows={4} />;
    if (status === "error")
        return <Notice title={t("sxClientDetailCertLoadErrorTitle")} description={t("sxLoadErrorDescription")} onRetry={refresh} />;

    return (
        <div className="flex flex-col gap-6">
            {KEYS.map(k => {
                const on = attrs[k.flag] === "true";
                const cert = info[k.attr]?.certificate;
                const showCert = on && !useMetadata && cert;
                return (
                    <Section key={k.attr} label={t(k.title)}>
                        <div className={GROUP}>
                            <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0 text-[15px] font-medium">{t(k.label)}</div>
                                <Switch
                                    checked={on}
                                    aria-label={t(k.label)}
                                    onCheckedChange={(v: boolean) => onToggle(k, v)}
                                    className="shrink-0"
                                />
                            </div>
                            {showCert && (
                                <>
                                    <div aria-hidden className={SEPARATOR} />
                                    <CertBlock cert={cert} onCopy={() => copy(cert)} />
                                    <div aria-hidden className={SEPARATOR} />
                                    <ActionLine onClick={() => regenerate(k)} danger>
                                        {t("sxClientDetailRegenerate")}
                                    </ActionLine>
                                    <div aria-hidden className={SEPARATOR} />
                                    <ActionLine onClick={() => setImporting(k)}>{t("sxClientDetailXImportKey")}</ActionLine>
                                    <div aria-hidden className={SEPARATOR} />
                                    <ActionLine onClick={() => setExporting(k)}>{t("sxCommonExport")}</ActionLine>
                                </>
                            )}
                        </div>
                        <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                            {useMetadata && on ? t("sxClientDetailXMetadataKeysNote") : t(k.explain)}
                        </p>
                    </Section>
                );
            })}

            {enabling && (
                <EnableKeyModal
                    id={id}
                    k={enabling}
                    onCancel={() => setEnabling(null)}
                    onDone={() => {
                        const k = enabling;
                        setEnabling(null);
                        saveFlag(k, true);
                    }}
                />
            )}
            {importing && (
                <ImportKeyModal
                    id={id}
                    k={importing}
                    onClose={() => setImporting(null)}
                    onDone={() => {
                        setImporting(null);
                        refresh();
                    }}
                />
            )}
            {exporting && (
                <KeyExportModal
                    id={id}
                    attr={exporting.attr}
                    defaultAlias={client?.clientId}
                    saml
                    onClose={() => setExporting(null)}
                />
            )}
            {confirmNode}
        </div>
    );
}

function EnableKeyModal({ id, k, onCancel, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const formats = useKeystoreFormats();
    const [method, setMethod] = useState("generate");
    const [generated, setGenerated] = useState<any>(null);
    const [form, setForm] = useState<any>({ format: "JKS", keyAlias: "", storePassword: "" });
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const name = t(k.label);

    const generate = async () => {
        setBusy(true);
        try {
            const res = await adminClient.clients.generateKey({ id, attr: k.attr });
            setGenerated(res);
            if (res?.privateKey) downloadBytes(res.privateKey, "private.key");
            addAlert(t("sxClientDetailKeyGenerated"), AlertVariant.success);
        } catch (e) {
            addError(t("sxClientDetailKeyGenerateFailed"), e);
        } finally {
            setBusy(false);
        }
    };

    const importValid = !!file && keystoreValid(form, false);
    const canConfirm = method === "generate" ? !!generated : !!file;

    const submit = async () => {
        if (method === "import") {
            if (!importValid) {
                setForm((f: any) => ({ ...f, touched: true }));
                return;
            }
            setBusy(true);
            try {
                await uploadKeyForm(adminClient, id, k.attr, form, file);
                addAlert(t("sxClientDetailCertImported"), AlertVariant.success);
            } catch (e) {
                addError(t("sxClientDetailCertImportFailed"), e);
                setBusy(false);
                return;
            }
        }
        onDone();
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onCancel()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxClientDetailXEnableKeyTitle", { key: name })}</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    <p className="text-[13px] leading-[1.4] text-muted-foreground">
                        {t("sxClientDetailXEnableKeyDescription", { key: name })}
                    </p>
                    <div className="min-w-0 overflow-hidden">
                        <SegmentTabs
                            ariaLabel={t("sxClientDetailXSelectMethod")}
                            value={method}
                            onChange={setMethod}
                            items={[
                                { value: "generate", label: t("sxClientDetailGenerate") },
                                { value: "import", label: t("sxClientsImport") }
                            ]}
                        />
                    </div>
                    {method === "generate" ? (
                        <div className="flex flex-col gap-3">
                            {generated?.certificate ? (
                                <>
                                    <div className={GROUP}>
                                        <div className="flex flex-col gap-2 px-4 py-3">
                                            <div className="text-[13px] text-muted-foreground">{t("sxClientDetailXCertificate")}</div>
                                            <code className="block max-h-32 overflow-y-auto font-mono text-xs break-all text-muted-foreground">
                                                {generated.certificate}
                                            </code>
                                        </div>
                                    </div>
                                    <p className="px-0.5 text-[13px] text-muted-foreground">{t("sxClientDetailXPrivateKeyDownloaded")}</p>
                                </>
                            ) : (
                                <Button variant="secondary" className="self-start" disabled={busy} onClick={generate}>
                                    {busy ? t("sxCommonGenerating") : t("sxClientDetailGenerate")}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <KeystoreFields
                                value={form}
                                onChange={setForm}
                                formats={formats}
                                withPem
                                withKeyPassword={false}
                                idPrefix={`enable-${k.attr}`}
                            />
                            <FilePicker file={file} onFile={setFile} id={`enable-${k.attr}-file`} />
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={busy || !canConfirm} onClick={submit}>
                        {t("sxCommonConfirm")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function ImportKeyModal({ id, k, onClose, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const formats = useKeystoreFormats();
    const [form, setForm] = useState<any>({ format: "JKS", keyAlias: "", storePassword: "" });
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!file || !keystoreValid(form, false)) {
            setForm((f: any) => ({ ...f, touched: true }));
            return;
        }
        setBusy(true);
        try {
            await uploadKeyForm(adminClient, id, k.attr, form, file);
            addAlert(t("sxClientDetailCertImported"), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxClientDetailCertImportFailed"), e);
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxClientDetailXImportKey")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    <KeystoreFields
                        value={form}
                        onChange={setForm}
                        formats={formats}
                        withPem
                        withKeyPassword={false}
                        idPrefix={`import-${k.attr}`}
                    />
                    <FilePicker file={file} onFile={setFile} id={`import-${k.attr}-file`} />
                </ModalBody>
                <ModalFooter>
                    <Button disabled={busy || !file} onClick={submit}>
                        {busy ? t("sxCommonProcessing") : t("sxClientsImport")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
