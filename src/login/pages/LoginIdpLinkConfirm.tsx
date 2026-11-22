import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginIdpLinkConfirm(props: PageProps<Extract<KcContext, { pageId: "login-idp-link-confirm.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url } = kcContext;

    const { msg } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("cfTitle")}>
            <form autoComplete="off" id="kc-register-form" action={url.loginAction} method="post" className="-mt-0.5 flex flex-col gap-1.5">
                <Button type="submit" size="form" block name="submitAction" id="linkAccount" value="linkAccount">
                    {msg("cfLink")}
                </Button>
                <Button
                    type="submit"
                    variant="secondary"
                    size="form"
                    block
                    name="submitAction"
                    id="updateProfile"
                    value="updateProfile"
                    className="bg-[#e5e5ea] hover:bg-[#e5e5ea]/80 dark:bg-[#2c2c2e] dark:hover:bg-[#2c2c2e]/80"
                >
                    {msg("cfReview")}
                </Button>
            </form>
        </Template>
    );
}
