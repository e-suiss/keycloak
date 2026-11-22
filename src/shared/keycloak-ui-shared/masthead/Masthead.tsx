/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/masthead/Masthead.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { ListIcon } from "@phosphor-icons/react";
import { Avatar, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { DropdownMenuItem } from "@ui/components/dropdown-menu";
import type { TFunction } from "i18next";
import type { Keycloak, KeycloakTokenParsed } from "oidc-spa/keycloak-js";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DefaultAvatar } from "./DefaultAvatar";
import { KeycloakDropdown } from "./KeycloakDropdown";

type AvatarProps = ComponentProps<typeof Avatar> & { src?: string; alt?: string };
type MastheadBrandProps = HTMLAttributes<HTMLDivElement> & {
    src?: string;
    alt?: string;
};
type MastheadMainProps = HTMLAttributes<HTMLElement>;

function loggedInUserName(token: KeycloakTokenParsed | undefined, t: TFunction) {
    if (!token) {
        return t("unknownUser");
    }

    const givenName = token.given_name;
    const familyName = token.family_name;
    const preferredUsername = token.preferred_username;

    if (givenName && familyName) {
        return t("fullName", { givenName, familyName });
    }

    return givenName || familyName || preferredUsername || t("unknownUser");
}

type BrandLogo = MastheadBrandProps;

type KeycloakMastheadProps = MastheadMainProps & {
    keycloak: Keycloak;
    brand: BrandLogo;
    avatar?: AvatarProps;
    features?: {
        hasLogout?: boolean;
        hasManageAccount?: boolean;
        hasUsername?: boolean;
    };
    kebabDropdownItems?: ReactNode[];
    dropdownItems?: ReactNode[];
    toolbarItems?: ReactNode[];
    toolbar?: ReactNode;
};

const KeycloakMasthead = ({
    keycloak,
    brand: { src, alt, className, ...brandProps },
    avatar,
    features: { hasLogout = true, hasManageAccount = true, hasUsername = true } = {},
    kebabDropdownItems,
    dropdownItems = [],
    toolbarItems,
    toolbar,
    ...rest
}: KeycloakMastheadProps) => {
    const { t } = useTranslation();
    const extraItems = [];
    if (hasManageAccount) {
        extraItems.push(
            <DropdownMenuItem
                key="manageAccount"
                onClick={() => keycloak.accountManagement()}
            >
                {t("manageAccount")}
            </DropdownMenuItem>
        );
    }
    if (hasLogout) {
        extraItems.push(
            <DropdownMenuItem key="signOut" onClick={() => keycloak.logout()}>
                {t("signOut")}
            </DropdownMenuItem>
        );
    }

    const picture = keycloak.idTokenParsed?.picture;
    const { src: avatarSrc, alt: avatarAlt, ...avatarRest } = avatar ?? {};
    const resolvedAvatarSrc = picture || avatarSrc;
    return (
        <header
            {...rest}
            className={`flex h-[var(--masthead-height,4.75rem)] w-full items-center gap-4 bg-background px-4 ${rest.className ?? ""}`}
        >
            <div className="flex items-center">
                <Button variant="ghost" size="icon" aria-label={t("navigation")}>
                    <ListIcon />
                </Button>
            </div>
            <div
                {...brandProps}
                className={`flex items-center ${brandProps.className ?? ""}`}
            >
                <img src={src} alt={alt} className={className} />
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
                {toolbar}
                <div className="flex items-center gap-2">
                    {toolbarItems?.map((item, index) => (
                        <div key={index} className="flex items-center">
                            {item}
                        </div>
                    ))}
                    <div className="hidden items-center md:flex">
                        <KeycloakDropdown
                            data-testid="options"
                            dropDownItems={[...dropdownItems, extraItems]}
                            title={
                                hasUsername
                                    ? loggedInUserName(keycloak.idTokenParsed, t)
                                    : undefined
                            }
                        />
                    </div>
                    <div className="flex items-center md:hidden">
                        <KeycloakDropdown
                            data-testid="options-kebab"
                            isKebab
                            dropDownItems={[
                                ...(kebabDropdownItems || dropdownItems),
                                extraItems
                            ]}
                        />
                    </div>
                    <div className="flex items-center">
                        {resolvedAvatarSrc ? (
                            <Avatar {...avatarRest}>
                                <AvatarImage
                                    src={resolvedAvatarSrc}
                                    alt={avatarAlt ?? t("avatar")}
                                />
                            </Avatar>
                        ) : (
                            <DefaultAvatar {...avatar} />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default KeycloakMasthead;
