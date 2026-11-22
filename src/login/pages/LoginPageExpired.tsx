import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginPageExpired(props: PageProps<Extract<KcContext, { pageId: "login-page-expired.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url } = kcContext;

    const { msg } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("peTitle")}>
            <div className="flex flex-col items-center">
                {/* The design sets this description apart from the shared one: 15px and 14px under the title. */}
                <p className="-mt-4.5 text-[15px] leading-[1.45] text-muted-foreground">{msg("peDescription")}</p>
                <Button size="form" block asChild className="mt-8">
                    <a id="loginRestartLink" href={url.loginRestartFlowUrl}>
                        {msg("peRestart")}
                    </a>
                </Button>
                <Button variant="plain" size="form" block asChild className="mt-1.5">
                    <a id="loginContinueLink" href={url.loginAction}>
                        {msg("peContinue")}
                    </a>
                </Button>
            </div>
        </Template>
    );
}
