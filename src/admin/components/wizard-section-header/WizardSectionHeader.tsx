/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/wizard-section-header/WizardSectionHeader.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

export type WizardSectionHeaderProps = {
    title: string;
    description?: string;
    showDescription?: boolean;
};

export const WizardSectionHeader = ({
    title,
    description,
    showDescription = false
}: WizardSectionHeaderProps) => {
    return (
        <>
            <h2
                className={
                    " font-semibold text-xl" +
                    (showDescription
                        ? "kc-wizard-section-header__title--has-description"
                        : "kc-wizard-section-header__title")
                }
            >
                {title}
            </h2>
            {showDescription && (
                <div className="kc-wizard-section-header__description space-y-2">
                    <p>{description}</p>
                </div>
            )}
        </>
    );
};
