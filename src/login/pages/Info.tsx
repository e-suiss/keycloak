import { Button } from "@ui/components/button";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function Info(props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { advancedMsgStr, msg } = i18n;

    const { messageHeader, skipLink, pageRedirectUri, actionUri, client } = kcContext;

    // The message itself is the subtitle (Template); one button continues the flow or returns to the app.
    const continueHref = actionUri ?? (pageRedirectUri || client.baseUrl);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={
                messageHeader ? <span dangerouslySetInnerHTML={{ __html: kcSanitize(advancedMsgStr(messageHeader)) }} /> : msg("inTitle")
            }
        >
            {!skipLink && continueHref && (
                <Button id="kc-info-message" size="form" block asChild className="-mt-0.5">
                    <a href={continueHref}>{msg("inContinue")}</a>
                </Button>
            )}
        </Template>
    );
}
