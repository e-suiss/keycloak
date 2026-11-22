import type { PageProps } from "keycloakify/login/pages/PageProps";
import { fillSlot } from "../fillSlot";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginVerifyEmail(props: PageProps<Extract<KcContext, { pageId: "login-verify-email.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msg, msgStr } = i18n;

    const { url, user } = kcContext;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} displayMessage={false} headerNode={msg("veTitle")}>
            <div className="flex flex-col items-center">
                {/* The design sets this description apart from the shared one: 15px and 14px under the title. */}
                <p className="-mt-4.5 text-[15px] leading-[1.45] text-muted-foreground">{msg("veDescription", user?.email ?? "")}</p>
                <p className="mt-7 text-sm leading-[1.45] text-muted-foreground">
                    {fillSlot(
                        msgStr("veResendText", "{0}"),
                        // Re-posting the action makes Keycloak send the verification email again.
                        <a href={url.loginAction} className="font-medium text-primary underline underline-offset-2">
                            {msgStr("veResend")}
                        </a>
                    )}
                </p>
            </div>
        </Template>
    );
}
