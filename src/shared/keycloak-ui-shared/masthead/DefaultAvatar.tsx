/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/masthead/DefaultAvatar.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

import { UserIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";

type DefaultAvatarProps = {
    className?: string;
    border?: "light" | "dark";
    size?: "sm" | "md" | "lg" | "xl";
};

const avatarSize = { sm: "sm", md: "default", lg: "lg", xl: "xl" } as const;

export const DefaultAvatar = ({ className, size = "md" }: DefaultAvatarProps) => (
    <Avatar size={avatarSize[size]} className={className}>
        <AvatarFallback>
            <UserIcon />
        </AvatarFallback>
    </Avatar>
);
