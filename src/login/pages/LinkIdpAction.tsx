import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LinkIdpAction(props: PageProps<Extract<KcContext, { pageId: "link-idp-action.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url } = kcContext;

    const { msg, msgStr } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} displayMessage={false} headerNode={msg("liTitle")}>
            <form autoComplete="off" action={url.loginAction} method="post" className="-mt-1 flex flex-col gap-1.5">
                <Button size="form" block name="continue" id="kc-continue" type="submit" value={msgStr("doContinue")}>
                    {msgStr("liContinue")}
                </Button>
                <Button
                    variant="secondary"
                    size="form"
                    block
                    name="cancel-aia"
                    id="kc-cancel"
                    type="submit"
                    value={msgStr("doCancel")}
                    className="bg-[#e5e5ea] hover:bg-[#e5e5ea]/80 dark:bg-[#2c2c2e] dark:hover:bg-[#2c2c2e]/80"
                >
                    {msgStr("liCancel")}
                </Button>
            </form>
        </Template>
    );
}
