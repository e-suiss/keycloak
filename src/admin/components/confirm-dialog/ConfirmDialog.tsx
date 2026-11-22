/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/confirm-dialog/ConfirmDialog.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { type ReactElement, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

export const useConfirmDialog = (
    props: ConfirmDialogProps
): [() => void, () => ReactElement] => {
    const [show, setShow] = useState(false);

    function toggleDialog() {
        setShow(show => !show);
    }

    const Dialog = () => (
        <ConfirmDialogModal
            key="confirmDialog"
            {...props}
            open={show}
            toggleDialog={toggleDialog}
        />
    );
    return [toggleDialog, Dialog];
};

export interface ConfirmDialogModalProps extends ConfirmDialogProps {
    open: boolean;
    toggleDialog: () => void;
}

export type ConfirmDialogProps = {
    titleKey: string;
    messageKey?: string;
    noCancelButton?: boolean;
    confirmButtonDisabled?: boolean;
    cancelButtonLabel?: string;
    continueButtonLabel?: string;
    continueButtonVariant?: string;
    variant?: "md" | "lg";
    onConfirm: () => void;
    onCancel?: () => void;
    children?: ReactNode;
};

export const ConfirmDialogModal = ({
    titleKey,
    messageKey,
    noCancelButton,
    cancelButtonLabel,
    continueButtonLabel,
    continueButtonVariant,
    onConfirm,
    onCancel,
    children,
    open = true,
    variant = "md",
    toggleDialog,
    confirmButtonDisabled
}: ConfirmDialogModalProps) => {
    const { t } = useTranslation();
    return (
        <Modal open={open} onOpenChange={o => !o && toggleDialog()}>
            <ModalContent className={variant === "lg" ? "sm:max-w-2xl" : undefined}>
                <ModalHeader>
                    <ModalTitle>{t(titleKey)}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {!messageKey && children}
                    {messageKey && t(messageKey)}
                </ModalBody>
                <ModalFooter>
                    {!noCancelButton && (
                        <Button
                            id="modal-cancel"
                            data-testid="cancel"
                            key="cancel"
                            variant="secondary"
                            onClick={() => {
                                if (onCancel) onCancel();
                                toggleDialog();
                            }}
                        >
                            {t(cancelButtonLabel || "cancel")}
                        </Button>
                    )}
                    <Button
                        id="modal-confirm"
                        data-testid="confirm"
                        key="confirm"
                        disabled={confirmButtonDisabled}
                        variant={continueButtonVariant as any}
                        onClick={() => {
                            onConfirm();
                            toggleDialog();
                        }}
                    >
                        {t(continueButtonLabel || "continue")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
