// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Spinner } from "@ui/components/spinner";
import { Textarea } from "@ui/components/textarea";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useState } from "react";
import { useT } from "../../ui/i18n";

const MAX_DESCRIPTION = 255;

export function EditFlowModal({
    title,
    initialName,
    initialDescription,
    onClose,
    onSave
}: {
    title: string;
    initialName: string;
    initialDescription?: string;
    onClose: () => void;
    onSave: (value: { name: string; description: string }) => Promise<boolean>;
}) {
    const t = useT();
    const [name, setName] = useState(initialName || "");
    const [description, setDescription] = useState(initialDescription || "");
    const [busy, setBusy] = useState(false);

    const nameMissing = !name.trim();
    const tooLong = description.length > MAX_DESCRIPTION;
    const unchanged = name.trim() === (initialName || "") && description === (initialDescription || "");

    const submit = async () => {
        if (nameMissing || tooLong || unchanged) return;
        setBusy(true);
        const ok = await onSave({ name: name.trim(), description });
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Modal open onOpenChange={o => !o && !busy && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            submit();
                        }}
                    >
                        <FieldGroup>
                            <Field size="lg" data-invalid={nameMissing ? true : undefined}>
                                <FieldLabel htmlFor="auth-edit-flow-name">{t("sxAuthName")}</FieldLabel>
                                <Input
                                    id="auth-edit-flow-name"
                                    size="lg"
                                    value={name}
                                    aria-invalid={nameMissing ? true : undefined}
                                    onChange={(e: any) => setName(e.target.value)}
                                    placeholder={t("sxAuthFlowNamePlaceholder")}
                                />
                                {nameMissing && <FieldError>{t("sxAuthXNameRequired")}</FieldError>}
                            </Field>
                            <Field size="lg" data-invalid={tooLong ? true : undefined}>
                                <FieldLabel htmlFor="auth-edit-flow-description">
                                    {t("sxAuthDescriptionLabel")}
                                </FieldLabel>
                                <Textarea
                                    id="auth-edit-flow-description"
                                    size="lg"
                                    value={description}
                                    aria-invalid={tooLong ? true : undefined}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                    placeholder={t("sxAuthOptional")}
                                />
                                {tooLong && (
                                    <FieldError>
                                        {t("sxAuthXDescriptionTooLong", { max: MAX_DESCRIPTION })}
                                    </FieldError>
                                )}
                            </Field>
                        </FieldGroup>
                        <button type="submit" hidden />
                    </form>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={submit} disabled={busy || nameMissing || tooLong || unchanged}>
                        {busy && <Spinner data-icon="inline-start" />}
                        {t("sxAuthSave")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
