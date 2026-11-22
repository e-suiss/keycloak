/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/group/GroupPath.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip";
import { useState } from "react";

type TableTextProps = React.HTMLAttributes<HTMLSpanElement>;

type GroupPathProps = TableTextProps & {
    group: GroupRepresentation;
};

export const GroupPath = ({
    group: { path },
    onMouseEnter: onMouseEnterProp,
    ...props
}: GroupPathProps) => {
    const [tooltip, setTooltip] = useState("");
    const onMouseEnter = (event: any) => {
        setTooltip(path!);
        onMouseEnterProp?.(event);
    };
    const text = (
        <span onMouseEnter={onMouseEnter} {...props}>
            {path}
        </span>
    );

    return tooltip !== "" ? (
        <Tooltip open>
            <TooltipTrigger asChild>{text}</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    ) : (
        text
    );
};
