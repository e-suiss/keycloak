import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function Error(props: PageProps<Extract<KcContext, { pageId: "error.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { client, skipLink, url } = kcContext;

    const { msg } = i18n;

    // The server's error text is the subtitle (Template); the page only offers the way back.
    const backHref = client?.baseUrl || url.loginUrl;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={msg("erTitle")}
        >
            {!skipLink && (
                <Button size="form" block asChild className="-mt-0.5">
                    <a id="backToApplication" href={backHref}>
                        {msg("erBack")}
                    </a>
                </Button>
            )}
        </Template>
    );
}
