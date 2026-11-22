/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/download-dialog/DownloadDialog.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { fetchWithError } from "@keycloak/keycloak-admin-client";
import { Label } from "@ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpItem, useFetch, useHelp } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useServerInfo } from "../../context/server-info/ServerInfoProvider";
import { addTrailingSlash, prettyPrintJSON } from "../../util";
import { getAuthorizationHeaders } from "../../utils/getAuthorizationHeaders";
import { ConfirmDialogModal } from "../confirm-dialog/ConfirmDialog";

type DownloadDialogProps = {
    id: string;
    protocol?: string;
    open: boolean;
    toggleDialog: () => void;
};

export const DownloadDialog = ({
    id,
    open,
    toggleDialog,
    protocol = "openid-connect"
}: DownloadDialogProps) => {
    const { adminClient } = useAdminClient();

    const { realm } = useRealm();
    const { t } = useTranslation();
    const { enabled } = useHelp();
    const serverInfo = useServerInfo();

    const configFormats = serverInfo.clientInstallations?.[protocol];
    const [selected, setSelected] = useState(configFormats[configFormats.length - 1].id);
    const [snippet, setSnippet] = useState<string | ArrayBuffer>();

    const selectedConfig = useMemo(
        () => configFormats.find(config => config.id === selected) ?? null,
        [selected, configFormats.find]
    );

    const sanitizeSnippet = (snippet: string) =>
        snippet.replace(
            /<PrivateKeyPem>.*<\/PrivateKeyPem>/gs,
            `<PrivateKeyPem>${t("privateKeyMask")}</PrivateKeyPem>`
        );

    useFetch(
        async () => {
            if (selectedConfig?.mediaType === "application/zip") {
                const response = await fetchWithError(
                    `${addTrailingSlash(
                        adminClient.baseUrl
                    )}admin/realms/${realm}/clients/${id}/installation/providers/${selected}`,
                    {
                        method: "GET",
                        headers: getAuthorizationHeaders(
                            await adminClient.getAccessToken()
                        )
                    }
                );

                return response.arrayBuffer();
            } else {
                const snippet = await adminClient.clients.getInstallationProviders({
                    id,
                    providerId: selected
                });
                if (typeof snippet === "string") {
                    return sanitizeSnippet(snippet);
                } else {
                    return prettyPrintJSON(snippet);
                }
            }
        },
        snippet => setSnippet(snippet),
        [id, selected]
    );

    // Clear snippet when selected config changes, this prevents old snippets from being displayed during fetch.
    useEffect(() => setSnippet(""), []);

    return (
        <ConfirmDialogModal
            titleKey={t("downloadAdaptorTitle")}
            continueButtonLabel={t("download")}
            onConfirm={() => {
                saveAs(
                    new Blob([snippet!], { type: selectedConfig?.mediaType }),
                    selectedConfig?.filename
                );
            }}
            open={open}
            toggleDialog={toggleDialog}
            variant="medium"
        >
            <form className="space-y-4">
                <div className="flex flex-col gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="type">
                            {t("formatOption")}
                            <HelpItem
                                helpText={t("downloadType")}
                                fieldLabelId="formatOption"
                            />
                        </Label>
                        <Select
                            value={selected}
                            onValueChange={value => setSelected(value || "")}
                        >
                            <SelectTrigger
                                id="type"
                                className="w-full"
                                aria-label={t("selectOne")}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {configFormats.map(configFormat => (
                                    <SelectItem
                                        key={configFormat.id}
                                        value={configFormat.id}
                                    >
                                        <span className="flex flex-col">
                                            <span>{configFormat.displayType}</span>
                                            {enabled && configFormat.helpText && (
                                                <span className="text-muted-foreground text-sm">
                                                    {configFormat.helpText}
                                                </span>
                                            )}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {!selectedConfig?.downloadOnly && (
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="details">
                                {t("details")}
                                <HelpItem
                                    helpText={t("detailsHelp")}
                                    fieldLabelId="details"
                                />
                            </Label>
                            <Textarea
                                id="details"
                                readOnly
                                rows={12}
                                className="resize-y"
                                value={
                                    snippet && typeof snippet === "string" ? snippet : ""
                                }
                                aria-label="text area example"
                            />
                        </div>
                    )}
                </div>
            </form>
        </ConfirmDialogModal>
    );
};
