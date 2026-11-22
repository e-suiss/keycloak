/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/oid4vci/Oid4Vci.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { IdentificationCardIcon } from "@phosphor-icons/react";
import { Card, CardContent } from "@ui/components/card";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { getIssuer, requestVCOffer } from "../api";
import type { CredentialsIssuer } from "../api/representations";
import { Page } from "../components/page/Page";
import { usePromise } from "../utils/usePromise";

export const Oid4Vci = () => {
    const context = useEnvironment();

    const { t } = useTranslation();

    const initialSelected = t("verifiableCredentialsSelectionDefault");

    const [selected, setSelected] = useState<string>(initialSelected);
    const [qrCode, setQrCode] = useState<string>("");
    const [_isOpen, setIsOpen] = useState<boolean>(false);
    const [offerQRVisible, setOfferQRVisible] = useState<boolean>(false);
    const [credentialsIssuer, setCredentialsIssuer] = useState<CredentialsIssuer>();

    usePromise(() => getIssuer(context), setCredentialsIssuer);

    const selectOptions = useMemo(() => {
        if (typeof credentialsIssuer !== "undefined") {
            return credentialsIssuer.credential_configurations_supported;
        }
        return {};
    }, [credentialsIssuer]);

    const dropdownItems = useMemo(() => {
        if (typeof selectOptions !== "undefined") {
            return Array.from(Object.keys(selectOptions));
        }
        return [];
    }, [selectOptions]);

    useEffect(() => {
        if (initialSelected !== selected && credentialsIssuer !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            requestVCOffer(context, selectOptions[selected], credentialsIssuer).then(
                blob => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const result = reader.result;
                        if (typeof result === "string") {
                            setQrCode(result);
                            setOfferQRVisible(true);
                            setIsOpen(false);
                        }
                    };
                }
            );
        }
    }, [selected, selectOptions, initialSelected, credentialsIssuer, context]);

    return (
        <Page
            title={t("verifiableCredentialsTitle")}
            description={t("verifiableCredentialsDescription")}
        >
            <div className="space-y-7">
                <section>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {t("verifiableCredentialsTitle")}
                    </h3>
                    <Card>
                        <CardContent className="flex flex-col gap-5">
                            <div className="flex items-center gap-3.5">
                                <IdentificationCardIcon className="size-5 text-muted-foreground" />
                                <NativeSelect
                                    data-testid="credential-select"
                                    value={selected}
                                    onChange={e => setSelected(e.target.value)}
                                    className="flex-1"
                                >
                                    <NativeSelectOption value={initialSelected}>
                                        {initialSelected}
                                    </NativeSelectOption>
                                    {dropdownItems.map(option => (
                                        <NativeSelectOption
                                            key={option}
                                            value={option}
                                            data-testid={option}
                                        >
                                            {option}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </div>

                            {offerQRVisible && (
                                <div className="flex justify-center">
                                    <img
                                        width="500"
                                        height="500"
                                        src={qrCode}
                                        data-testid="qr-code"
                                        className="size-auto max-w-full"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </Page>
    );
};

export default Oid4Vci;
