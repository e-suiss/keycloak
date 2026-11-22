import { Spinner } from "@ui/components/spinner";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useEffect, useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function FrontchannelLogout(props: PageProps<Extract<KcContext, { pageId: "frontchannel-logout.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { logout } = kcContext;

    const { msg, msgStr } = i18n;

    const [iframeLoadCount, setIframeLoadCount] = useState(0);

    // Every client is signed out in a hidden iframe; once all have loaded, continue to the redirect.
    useEffect(() => {
        if (!logout.logoutRedirectUri) {
            return;
        }

        if (iframeLoadCount !== logout.clients.length) {
            return;
        }

        window.location.replace(logout.logoutRedirectUri);
    }, [iframeLoadCount, logout.logoutRedirectUri, logout.clients.length]);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            documentTitle={msgStr("flTitle")}
            headerNode={msg("flTitle")}
        >
            <div className="-mt-1 flex justify-center">
                <Spinner className="size-6 text-muted-foreground" aria-label={msgStr("flTitle")} />
            </div>
            {logout.clients.map(client => (
                <iframe
                    key={client.name}
                    title={client.name}
                    src={client.frontChannelLogoutUrl}
                    hidden
                    onLoad={() => setIframeLoadCount(count => count + 1)}
                />
            ))}
        </Template>
    );
}
