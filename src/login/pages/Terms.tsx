import { Button } from "@ui/components/button";
import { ScrollArea } from "@ui/components/scroll-area";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

/** Keycloak's single "Terms and Conditions" required action; the text is the realm's `termsText` message. */
export default function Terms(props: PageProps<Extract<KcContext, { pageId: "terms.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msg, msgStr } = i18n;

    const { url } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={msg("tmTitle")}
        >
            <div className="-mt-0.5 flex flex-col">
                {/* Same gray card as the OAuth grant scope list; long text scrolls inside it. */}
                <div className="overflow-hidden rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] dark:border-[#38383a] dark:bg-[#1c1c1e]">
                    <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-72">
                        <div
                            id="kc-terms-text"
                            className="px-4 py-3.5 text-left text-sm leading-normal text-muted-foreground [&_a]:text-primary [&_h4]:mb-1 [&_h4]:font-semibold [&_h4]:text-foreground [&_h4:not(:first-child)]:mt-3 [&_p:not(:last-child)]:mb-2"
                        >
                            {msg("termsText")}
                        </div>
                    </ScrollArea>
                </div>
                <form autoComplete="off" action={url.loginAction} method="POST" className="mt-7 flex flex-col gap-1.5">
                    <Button size="form" block name="accept" id="kc-accept" type="submit" value={msgStr("doAccept")}>
                        {msgStr("rgAccept")}
                    </Button>
                    <Button variant="plain" size="form" block name="cancel" id="kc-decline" type="submit" value={msgStr("doDecline")}>
                        {msgStr("tmDecline")}
                    </Button>
                </form>
            </div>
        </Template>
    );
}
