import type { PageProps } from "keycloakify/login/pages/PageProps";
import { fillSlot } from "../fillSlot";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginIdpLinkEmail(props: PageProps<Extract<KcContext, { pageId: "login-idp-link-email.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url } = kcContext;

    const { msg, msgStr } = i18n;

    const link = (label: string) => (
        <a href={url.loginAction} className="font-medium text-primary hover:underline">
            {label}
        </a>
    );

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} displayMessage={false} headerNode={msg("leTitle")}>
            <div className="-mt-2.5 flex flex-col gap-2.5 text-sm leading-normal text-muted-foreground">
                <p id="instruction2">{fillSlot(msgStr("leResendText", "{0}"), link(msgStr("leResend")))}</p>
                <p id="instruction3">{fillSlot(msgStr("leContinueText", "{0}"), link(msgStr("leContinue")))}</p>
            </div>
        </Template>
    );
}
