import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext, Term } from "../KcContext";
import { TermsList } from "../TermsList";

/**
 * Login-time terms re-consent — React counterpart of "terms-reconsent.ftl"
 * (RequiredAction "terms-reconsent"): the terms that are new or changed since the user last accepted.
 */
export default function TermsReconsent(props: PageProps<Extract<KcContext, { pageId: "terms-reconsent.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, terms, message } = kcContext;
    const list: Term[] = terms ?? [];

    const { msg, msgStr } = i18n;

    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | undefined>(undefined);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={message !== undefined}
            headerNode={msg("trTitle")}
        >
            <form autoComplete="off"
                id="cr-terms-form"
                action={url.loginAction}
                method="post"
                className="-mt-0.5 flex flex-col"
                onSubmit={e => {
                    if (list.some(t => t.required && !checked[t.key])) {
                        e.preventDefault();
                        setError(msgStr("rgTermsRequired"));
                    }
                }}
            >
                <TermsList
                    terms={list}
                    checked={checked}
                    onCheckedChange={(key, value) => {
                        setChecked(c => ({ ...c, [key]: value }));
                        setError(undefined);
                    }}
                    acceptLabel={msgStr("rgAccept")}
                    error={error}
                />
                <Button type="submit" size="form" block className="mt-7">
                    {msgStr("doContinue")}
                </Button>
            </form>
        </Template>
    );
}
