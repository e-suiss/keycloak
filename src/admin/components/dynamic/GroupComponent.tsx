/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/GroupComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import { XIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { HelpItem } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import {
    GroupResourceContext,
    useGroupResource
} from "../../context/group-resource/GroupResourceContext";
import { useServerInfo } from "../../context/server-info/ServerInfoProvider";
import { GroupPickerDialog } from "../group/GroupPickerDialog";
import type { ComponentProps } from "./components";

export const GroupComponent = ({
    name,
    label,
    helpText,
    required,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [openOrgGroups, setOpenOrgGroups] = useState(false);
    const [groups, setGroups] = useState<GroupRepresentation[]>();
    const { control, setValue } = useFormContext();
    const { adminClient } = useAdminClient();
    const serverInfo = useServerInfo();
    const hasLinkedOrganization = useGroupResource().isOrgGroups();
    const groupTypeFieldName = convertToName("groupType");

    // Get group type enum values from server
    const groupTypes = serverInfo.enums?.type || [];
    const GROUP_TYPE_REALM = groupTypes.find((t: string) => t === "REALM") || "REALM";
    const GROUP_TYPE_ORG =
        groupTypes.find((t: string) => t === "ORGANIZATION") || "ORGANIZATION";

    const groupType = useWatch({
        name: groupTypeFieldName,
        control,
        defaultValue: GROUP_TYPE_REALM
    });

    const shouldRenderOrgField = hasLinkedOrganization || groupType === GROUP_TYPE_ORG;
    return (
        <Controller
            name={convertToName(name!)}
            defaultValue=""
            control={control}
            render={({ field }) => (
                <>
                    {open && (
                        <GroupResourceContext value={adminClient.groups}>
                            <GroupPickerDialog
                                type="selectOne"
                                text={{
                                    title: "selectGroup",
                                    ok: "select"
                                }}
                                onConfirm={groups => {
                                    field.onChange(groups?.[0].path);
                                    setValue(groupTypeFieldName, GROUP_TYPE_REALM);
                                    setGroups(groups);
                                    setOpen(false);
                                }}
                                onClose={() => setOpen(false)}
                                filterGroups={groups}
                            />
                        </GroupResourceContext>
                    )}
                    {openOrgGroups && (
                        <GroupPickerDialog
                            type="selectOne"
                            text={{
                                title: "selectOrgGroup",
                                ok: "select"
                            }}
                            onConfirm={groups => {
                                field.onChange(groups?.[0].path);
                                setValue(groupTypeFieldName, GROUP_TYPE_ORG);
                                setGroups(groups);
                                setOpenOrgGroups(false);
                            }}
                            onClose={() => setOpenOrgGroups(false)}
                            filterGroups={groups}
                        />
                    )}

                    <Field>
                        <FieldLabel htmlFor={name!}>
                            {t(label!)}
                            {required && <span className="text-destructive">*</span>}
                            <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
                        </FieldLabel>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-1.5">
                                {field.value && (
                                    <Badge variant="secondary">
                                        {shouldRenderOrgField && (
                                            <>
                                                {groupType === GROUP_TYPE_REALM
                                                    ? t("realm")
                                                    : t("organization")}
                                                :&nbsp;
                                            </>
                                        )}
                                        {field.value}
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label={t("remove")}
                                            onClick={() => {
                                                field.onChange(undefined);
                                                setValue(groupTypeFieldName, undefined);
                                            }}
                                        >
                                            <XIcon />
                                        </Button>
                                    </Badge>
                                )}
                            </div>
                            <Button
                                id="kc-join-groups-button"
                                onClick={() => setOpen(true)}
                                variant="secondary"
                                data-testid="join-groups-button"
                            >
                                {t("selectGroup")}
                            </Button>
                            {shouldRenderOrgField && (
                                <Button
                                    id="kc-join-org-groups-button"
                                    onClick={() => setOpenOrgGroups(true)}
                                    variant="secondary"
                                    data-testid="join-org-groups-button"
                                >
                                    {t("selectOrgGroup")}
                                </Button>
                            )}
                        </div>
                    </Field>
                </>
            )}
        />
    );
};
