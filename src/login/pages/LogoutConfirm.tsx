import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LogoutConfirm(props: PageProps<Extract<KcContext, { pageId: "logout-confirm.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, client, logoutConfirm } = kcContext;

    const { msg, msgStr } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("lcTitle")}>
            <form autoComplete="off" id="kc-logout-confirm" action={url.logoutConfirmAction} method="POST" className="-mt-0.5 flex flex-col gap-1.5">
                <input type="hidden" name="session_code" value={logoutConfirm.code} />
                <Button size="form" block name="confirmLogout" id="kc-logout" type="submit" value={msgStr("doLogout")}>
                    {msg("lcSubmit")}
                </Button>
                {!logoutConfirm.skipLink && client.baseUrl && (
                    <Button variant="plain" size="form" block asChild>
                        <a href={client.baseUrl}>{msg("lcBack")}</a>
                    </Button>
                )}
            </form>
        </Template>
    );
}
