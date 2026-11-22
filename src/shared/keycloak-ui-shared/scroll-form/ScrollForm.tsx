/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/scroll-form/ScrollForm.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Fragment, type HTMLAttributes, type ReactNode, useMemo } from "react";
import { FormPanel } from "./FormPanel";
import { ScrollPanel } from "./ScrollPanel";

export const mainPageContentId = "kc-main-content-page-container";

type ScrollSection = {
    title: string;
    panel: ReactNode;
    isHidden?: boolean;
};

type ScrollFormProps = HTMLAttributes<HTMLDivElement> & {
    label: string;
    sections: ScrollSection[];
    borders?: boolean;
};

const spacesToHyphens = (string: string): string => {
    return string.replace(/\s+/g, "-");
};

export const ScrollForm = ({
    label,
    sections,
    borders = false,
    ...rest
}: ScrollFormProps) => {
    const shownSections = useMemo(
        () => sections.filter(({ isHidden }) => !isHidden),
        [sections]
    );

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12" {...rest}>
            <div className="order-last md:order-first md:col-span-8">
                {shownSections.map(({ title, panel }) => {
                    const scrollId = spacesToHyphens(title.toLowerCase());

                    return (
                        <Fragment key={title}>
                            {borders ? (
                                <FormPanel
                                    scrollId={scrollId}
                                    title={title}
                                    className="mt-6"
                                >
                                    {panel}
                                </FormPanel>
                            ) : (
                                <ScrollPanel scrollId={scrollId} title={title}>
                                    {panel}
                                </ScrollPanel>
                            )}
                        </Fragment>
                    );
                })}
            </div>
            <div className="md:col-span-4">
                <div className="sticky top-0 p-6">
                    <nav aria-label={label} className="flex flex-col gap-2">
                        {label ? (
                            <span className="font-semibold text-muted-foreground text-sm">
                                {label}
                            </span>
                        ) : null}
                        {shownSections.map(({ title }) => {
                            const scrollId = spacesToHyphens(title.toLowerCase());

                            return (
                                <a
                                    key={title}
                                    href={`#${scrollId}`}
                                    onClick={event => {
                                        event.preventDefault();
                                        const element = document.getElementById(scrollId);
                                        if (element) {
                                            element.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start"
                                            });
                                        }
                                    }}
                                    data-testid={`jump-link-${scrollId}`}
                                    className="text-muted-foreground text-sm hover:text-foreground"
                                >
                                    {title}
                                </a>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </div>
    );
};
