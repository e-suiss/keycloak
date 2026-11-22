/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/view-header/ViewHeader.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Field, FieldLabel } from "@ui/components/field";
import { Separator } from "@ui/components/separator";
import { Switch } from "@ui/components/switch";
import {
    Fragment,
    isValidElement,
    type ReactElement,
    type ReactNode,
    useState
} from "react";
import { useTranslation } from "react-i18next";
import { HelpItem, useHelp } from "../../../shared/keycloak-ui-shared";
import { FormattedLink } from "../external-link/FormattedLink";
import "../../help-urls";

export type ViewHeaderProps = {
    titleKey: string;
    className?: string;
    badges?: ViewHeaderBadge[];
    isDropdownDisabled?: boolean;
    subKey?: string | ReactNode;
    actionsDropdownId?: string;
    helpUrl?: string | undefined;
    dropdownItems?: ReactElement[];
    lowerDropdownItems?: any;
    lowerDropdownMenuTitle?: any;
    lowerButton?: any;
    isEnabled?: boolean;
    onToggle?: (value: boolean) => void;
    divider?: boolean;
    helpTextKey?: string;
    isReadOnly?: boolean;
    actionDropdownTitle?: string;
};

export type ViewHeaderBadge = {
    id?: string;
    text?: string | ReactNode;
    readonly?: boolean;
};

export const ViewHeader = ({
    actionsDropdownId,
    className,
    titleKey,
    badges,
    isDropdownDisabled,
    subKey,
    helpUrl,
    dropdownItems,
    lowerDropdownMenuTitle,
    lowerDropdownItems,
    lowerButton,
    isEnabled = true,
    onToggle,
    divider = true,
    helpTextKey,
    isReadOnly = false,
    actionDropdownTitle = "action"
}: ViewHeaderProps) => {
    const { t, i18n } = useTranslation();
    const { enabled } = useHelp();
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isLowerDropdownOpen, setIsLowerDropdownOpen] = useState(false);

    const onDropdownToggle = () => {
        setDropdownOpen(!isDropdownOpen);
    };

    const onLowerDropdownToggle = () => {
        setIsLowerDropdownOpen(!isLowerDropdownOpen);
    };

    const toKey = (value: string) => value.replace(/\s/g, "-");

    return (
        <>
            <section className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1
                            className={`font-semibold text-xl ${className ?? ""}`}
                            data-testid="view-header"
                        >
                            {i18n.exists(titleKey) ? t(titleKey) : titleKey}
                        </h1>
                        {badges && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {badges.map((badge, index) => (
                                    <Fragment key={index}>
                                        {!isValidElement(badge.text) && (
                                            <Fragment key={badge.text as string}>
                                                <Badge
                                                    data-testid={badge.id}
                                                    variant={
                                                        badge.readonly
                                                            ? "secondary"
                                                            : undefined
                                                    }
                                                >
                                                    {badge.text}
                                                </Badge>{" "}
                                            </Fragment>
                                        )}
                                        {isValidElement(badge.text) && badge.text}{" "}
                                    </Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {onToggle && (
                            <Field orientation="horizontal" className="w-auto">
                                <Switch
                                    id={`${toKey(titleKey)}-switch`}
                                    data-testid={`${titleKey}-switch`}
                                    disabled={isReadOnly}
                                    checked={isEnabled}
                                    aria-label={t("enabled")}
                                    onCheckedChange={value => {
                                        onToggle(value);
                                    }}
                                />
                                <FieldLabel htmlFor={`${toKey(titleKey)}-switch`}>
                                    {isEnabled ? t("enabled") : t("disabled")}
                                </FieldLabel>
                                {helpTextKey && (
                                    <HelpItem
                                        helpText={t(helpTextKey)}
                                        fieldLabelId={`${toKey(titleKey)}-switch`}
                                    />
                                )}
                            </Field>
                        )}
                        {dropdownItems && (
                            <DropdownMenu
                                open={isDropdownOpen}
                                onOpenChange={onDropdownToggle}
                            >
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={isDropdownDisabled}
                                        id={actionsDropdownId}
                                        data-testid="action-dropdown"
                                    >
                                        {t(actionDropdownTitle)}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {dropdownItems}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                {enabled && (
                    <div id="view-header-subkey" className="mt-2">
                        <p>
                            {isValidElement(subKey)
                                ? subKey
                                : subKey
                                  ? t(subKey as string)
                                  : ""}
                            {helpUrl && (
                                <FormattedLink
                                    title={t("learnMore")}
                                    href={helpUrl}
                                    isInline
                                    className="ml-2"
                                />
                            )}
                        </p>
                    </div>
                )}
                {lowerDropdownItems && (
                    <DropdownMenu
                        open={isLowerDropdownOpen}
                        onOpenChange={onLowerDropdownToggle}
                    >
                        <DropdownMenuTrigger asChild>
                            <Button id="ufToggleId">{t(lowerDropdownMenuTitle)}</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>{lowerDropdownItems}</DropdownMenuContent>
                    </DropdownMenu>
                )}
                {lowerButton && (
                    <Button
                        variant={lowerButton.variant}
                        onClick={lowerButton.onClick}
                        data-testid="viewHeader-lower-btn"
                    >
                        {lowerButton.lowerButtonTitle}
                    </Button>
                )}
            </section>
            {divider && <Separator />}
        </>
    );
};
