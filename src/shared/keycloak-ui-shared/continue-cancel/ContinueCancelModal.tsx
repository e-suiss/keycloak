/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/continue-cancel/ContinueCancelModal.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
type ButtonProps = ComponentProps<typeof Button>;
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { type ComponentProps, type ReactNode, useState } from "react";

export type ContinueCancelModalProps = {
    modalTitle: string;
    continueLabel: string;
    cancelLabel: string;
    buttonTitle: string | ReactNode;
    buttonVariant?: ButtonProps["variant"];
    buttonTestRole?: string;
    isDisabled?: boolean;
    onContinue: () => void;
    component?: React.ElementType<any> | React.ComponentType<any>;
    children?: ReactNode;
};

export const ContinueCancelModal = ({
    modalTitle,
    continueLabel,
    cancelLabel,
    buttonTitle,
    isDisabled,
    buttonVariant,
    buttonTestRole,
    onContinue,
    component = Button,
    children
}: ContinueCancelModalProps) => {
    const [open, setOpen] = useState(false);
    const Component = component;

    return (
        <>
            <Component
                variant={buttonVariant}
                onClick={() => setOpen(true)}
                disabled={isDisabled}
                data-testrole={buttonTestRole}
            >
                {buttonTitle}
            </Component>
            <Modal open={open} onOpenChange={o => !o && setOpen(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{modalTitle}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>{children}</ModalBody>
                    <ModalFooter>
                        <Button
                            id="modal-confirm"
                            onClick={() => {
                                setOpen(false);
                                onContinue();
                            }}
                        >
                            {continueLabel}
                        </Button>
                        <Button
                            id="modal-cancel"
                            variant="secondary"
                            onClick={() => setOpen(false)}
                        >
                            {cancelLabel}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};
