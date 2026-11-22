import { Button } from "@ui/components/button";
import { Spinner } from "@ui/components/spinner";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useEffect, useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function SamlPostForm(props: PageProps<Extract<KcContext, { pageId: "saml-post-form.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msg, msgStr } = i18n;

    const { samlPost } = kcContext;

    const [htmlFormElement, setHtmlFormElement] = useState<HTMLFormElement | null>(null);

    useEffect(() => {
        if (htmlFormElement === null) {
            return;
        }

        // Storybook
        if (samlPost.url === "#") {
            return;
        }

        htmlFormElement.requestSubmit();
    }, [htmlFormElement, samlPost.url]);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            documentTitle={msgStr("spTitle")}
            headerNode={msg("spTitle")}
        >
            {/* Same as the front-channel logout page: a spinner while the form posts itself. */}
            <div className="-mt-1 flex flex-col items-center">
                <Spinner className="size-6 text-muted-foreground" aria-label={msgStr("spTitle")} />
                <form autoComplete="off" name="saml-post-binding" method="post" action={samlPost.url} ref={setHtmlFormElement} className="w-full">
                    {samlPost.SAMLRequest && <input type="hidden" name="SAMLRequest" value={samlPost.SAMLRequest} />}
                    {samlPost.SAMLResponse && <input type="hidden" name="SAMLResponse" value={samlPost.SAMLResponse} />}
                    {samlPost.relayState && <input type="hidden" name="RelayState" value={samlPost.relayState} />}
                    <noscript>
                        <p className="mt-7 text-sm leading-[1.45] text-muted-foreground">{msg("spJsDisabled")}</p>
                        <Button type="submit" value={msgStr("doContinue")} size="form" block className="mt-5">
                            {msgStr("doContinue")}
                        </Button>
                    </noscript>
                </form>
            </div>
        </Template>
    );
}
