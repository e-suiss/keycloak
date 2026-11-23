// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Spinner } from "@ui/components/spinner";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Notice } from "../../ui/kit";

const TYPES = [
    { value: "basic-flow", label: "sxAuthXFlowTypeGeneric" },
    { value: "form-flow", label: "sxAuthXFlowTypeForm" }
];

export function AddSubFlowModal({
    flowName,
    onClose,
    onAdd
}: {
    flowName: string;
    onClose: () => void;
    onAdd: (value: { name: string; description: string; type: string; provider: string }) => Promise<boolean>;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("basic-flow");
    const [provider, setProvider] = useState("");
    const [providers, setProviders] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [attempt, setAttempt] = useState(0);
    const [touched, setTouched] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.authenticationManagement
            .getFormProviders()
            .then((list: any) => {
                if (!alive) return;
                const arr = Array.isArray(list) ? list : [];
                setProviders(arr);
                setProvider(p => p || arr[0]?.id || "");
                setStatus("ready");
            })
            .catch(() => {
                if (alive) setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [attempt]);

    const nameMissing = !name.trim();
    const formBlocked = type === "form-flow" && status !== "ready";

    const submit = async () => {
        setTouched(true);
        if (nameMissing || formBlocked) return;
        setBusy(true);
        const ok = await onAdd({
            name: name.trim(),
            description,
            type,
            provider: provider || ""
        });
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Modal open onOpenChange={o => !o && !busy && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxAuthXAddSubFlowTo", { name: flowName })}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            submit();
                        }}
                    >
                        <FieldGroup>
                            <Field size="lg" data-invalid={touched && nameMissing ? true : undefined}>
                                <FieldLabel htmlFor="auth-subflow-name">{t("sxAuthName")}</FieldLabel>
                                <Input
                                    id="auth-subflow-name"
                                    size="lg"
                                    autoFocus
                                    value={name}
                                    aria-invalid={touched && nameMissing ? true : undefined}
                                    onChange={(e: any) => setName(e.target.value)}
                                    placeholder={t("sxAuthFlowNamePlaceholder")}
                                />
                                {touched && nameMissing && <FieldError>{t("sxAuthXNameRequired")}</FieldError>}
                            </Field>
                            <Field size="lg">
                                <FieldLabel htmlFor="auth-subflow-description">
                                    {t("sxAuthDescriptionLabel")}
                                </FieldLabel>
                                <Input
                                    id="auth-subflow-description"
                                    size="lg"
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                    placeholder={t("sxAuthOptional")}
                                />
                            </Field>
                            <Field size="lg">
                                <FieldLabel htmlFor="auth-subflow-type">{t("sxAuthFlowType")}</FieldLabel>
                                <NativeSelect
                                    id="auth-subflow-type"
                                    size="lg"
                                    className="w-full"
                                    value={type}
                                    onChange={(e: any) => setType(e.target.value)}
                                >
                                    {TYPES.map(x => (
                                        <NativeSelectOption key={x.value} value={x.value}>
                                            {t(x.label)}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                                <FieldDescription className="ps-0.5 text-[13px]">
                                    {type === "form-flow"
                                        ? t("sxAuthXFlowTypeFormHint")
                                        : t("sxAuthXFlowTypeGenericHint")}
                                </FieldDescription>
                            </Field>
                            {type === "form-flow" &&
                                (status === "loading" ? (
                                    <div className="h-12 animate-pulse rounded-xl bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
                                ) : status === "error" ? (
                                    <Notice
                                        title={t("sxAuthXFormProvidersLoadError")}
                                        description={t("sxLoadErrorDescription")}
                                        onRetry={() => setAttempt(n => n + 1)}
                                    />
                                ) : providers.length > 1 ? (
                                    <Field size="lg">
                                        <FieldLabel htmlFor="auth-subflow-provider">
                                            {t("sxAuthXProvider")}
                                        </FieldLabel>
                                        <NativeSelect
                                            id="auth-subflow-provider"
                                            size="lg"
                                            className="w-full"
                                            value={provider}
                                            onChange={(e: any) => setProvider(e.target.value)}
                                        >
                                            {providers.map((p: any) => (
                                                <NativeSelectOption key={p.id} value={p.id}>
                                                    {p.displayName || p.id}
                                                </NativeSelectOption>
                                            ))}
                                        </NativeSelect>
                                    </Field>
                                ) : null)}
                        </FieldGroup>
                        <button type="submit" hidden />
                    </form>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={submit} disabled={busy || formBlocked}>
                        {busy && <Spinner data-icon="inline-start" />}
                        {t("sxCommonAdd")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
