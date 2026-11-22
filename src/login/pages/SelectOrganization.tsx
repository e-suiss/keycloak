import { BuildingsIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { type MouseEvent, useRef, useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function SelectOrganization(props: PageProps<Extract<KcContext, { pageId: "select-organization.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, user } = kcContext;

    const { msg } = i18n;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const organizationInputRef = useRef<HTMLInputElement>(null);

    const onOrganizationClick = (organizationAlias: string) => (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();

        if (!organizationInputRef.current || !formRef.current) {
            return;
        }

        organizationInputRef.current.value = organizationAlias;
        setIsSubmitting(true);

        if (typeof formRef.current.requestSubmit === "function") {
            formRef.current.requestSubmit();
            return;
        }

        formRef.current.submit();
    };

    const organizations = user.organizations ?? [];

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={msg("soTitle")}
        >
            {/* Same input-styled boxes as the sign-in method page. */}
            <form autoComplete="off" ref={formRef} action={url.loginAction} method="post" className="-mt-0.5">
                <div id="kc-user-organizations" className="flex flex-col gap-2">
                    {organizations.map(({ alias, name }) => (
                        <button
                            key={alias}
                            id={`organization-${alias}`}
                            type="button"
                            onClick={onOrganizationClick(alias)}
                            disabled={isSubmitting}
                            className="flex h-13.5 w-full cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-background px-4 text-left transition-colors outline-none hover:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:bg-foreground/6"
                        >
                            <BuildingsIcon aria-hidden className="size-5.5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate text-[17px]">{name ?? alias}</span>
                            <CaretRightIcon aria-hidden weight="bold" className="size-3.5 shrink-0 text-muted-foreground/60" />
                        </button>
                    ))}
                </div>
                <input ref={organizationInputRef} type="hidden" name="kc.org" />
            </form>
        </Template>
    );
}
