/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/icons/IconMapper.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    CubeIcon,
    FacebookLogoIcon,
    GitForkIcon,
    GithubLogoIcon,
    GitlabLogoIcon,
    GoogleLogoIcon,
    HexagonIcon,
    InstagramLogoIcon,
    LinkedinLogoIcon,
    PaypalLogoIcon,
    StackOverflowLogoIcon,
    TwitterLogoIcon,
    WindowsLogoIcon
} from "@phosphor-icons/react";

type IconMapperProps = {
    icon: string;
};

export const IconMapper = ({ icon }: IconMapperProps) => {
    const SpecificIcon = getIcon(icon);
    return (
        <span className="inline-flex [&_svg]:size-6">
            <SpecificIcon alt={icon} />
        </span>
    );
};

function getIcon(icon: string) {
    switch (icon) {
        case "github":
            return GithubLogoIcon;
        case "facebook":
            return FacebookLogoIcon;
        case "gitlab":
            return GitlabLogoIcon;
        case "google":
            return GoogleLogoIcon;
        case "linkedin":
        case "linkedin-openid-connect":
            return LinkedinLogoIcon;

        case "openshift-v4":
            return HexagonIcon;
        case "stackoverflow":
            return StackOverflowLogoIcon;
        case "twitter":
            return TwitterLogoIcon;
        case "microsoft":
            return WindowsLogoIcon;
        case "bitbucket":
            return GitForkIcon;
        case "instagram":
            return InstagramLogoIcon;
        case "paypal":
            return PaypalLogoIcon;
        default:
            return CubeIcon;
    }
}
