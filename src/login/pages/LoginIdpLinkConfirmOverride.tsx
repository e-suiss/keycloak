import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginIdpLinkConfirmOverride(props: PageProps<Extract<KcContext, { pageId: "login-idp-link-confirm-override.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url } = kcContext;

    const { msg } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("coTitle")}>
            <form autoComplete="off" id="kc-register-form" action={url.loginAction} method="post" className="-mt-0.5 flex flex-col gap-1.5">
                <Button type="submit" size="form" block name="submitAction" id="confirmOverride" value="confirmOverride">
                    {msg("coOverride")}
                </Button>
                <Button variant="plain" size="form" block asChild>
                    <a id="loginRestartLink" href={url.loginRestartFlowUrl}>
                        {msg("coRestart")}
                    </a>
                </Button>
            </form>
        </Template>
    );
}
