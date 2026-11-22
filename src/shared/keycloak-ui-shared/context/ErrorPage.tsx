/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/context/ErrorPage.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
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
import { useTranslation } from "react-i18next";
import { getNetworkErrorMessage } from "../utils/errors";

type ErrorPageProps = {
    error?: unknown;
};

export const ErrorPage = (props: ErrorPageProps) => {
    const { t, i18n } = useTranslation();
    const error = props.error;
    const errorMessage = getErrorMessage(error);
    const networkErrorMessage = getNetworkErrorMessage(error);
    console.error(error);

    function onRetry() {
        location.href = location.origin + location.pathname;
    }

    return (
        <div>
            <Modal open onOpenChange={() => {}}>
                <ModalContent showCloseButton={false}>
                    <ModalHeader>
                        <ModalTitle>{t("somethingWentWrong")}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-2">
                            {errorMessage ? (
                                <p>{t(errorMessage)}</p>
                            ) : networkErrorMessage && i18n.exists(networkErrorMessage) ? (
                                <p>{t(networkErrorMessage)}</p>
                            ) : (
                                <p>{t("somethingWentWrongDescription")}</p>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button key="tryAgain" onClick={onRetry}>
                            {t("tryAgain")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

function getErrorMessage(error: unknown): string | null {
    if (error instanceof Error) {
        return error.message;
    }

    return null;
}
