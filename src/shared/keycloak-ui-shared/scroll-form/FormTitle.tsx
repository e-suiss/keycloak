/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/scroll-form/FormTitle.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { HTMLAttributes } from "react";

const sizeClasses: Record<string, string> = {
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl"
};

type FormTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, "id"> & {
    id?: string;
    title: string;
    headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    size?: keyof typeof sizeClasses;
};

export const FormTitle = ({
    id,
    title,
    headingLevel = "h1",
    size = "xl",
    className,
    ...rest
}: FormTitleProps) => {
    const Heading = headingLevel;
    return (
        <Heading
            className={`mb-6 font-semibold ${sizeClasses[size] ?? "text-xl"}${className ? ` ${className}` : ""}`}
            id={id}
            tabIndex={0} // so that jumpLink sends focus to the section for a11y
            {...rest}
        >
            {title}
        </Heading>
    );
};
