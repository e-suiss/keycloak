import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useScript } from "keycloakify/login/pages/WebauthnRegister.useScript";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function WebauthnRegister(props: PageProps<Extract<KcContext, { pageId: "webauthn-register.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, isSetRetry, isAppInitiatedAction } = kcContext;

    const { msg, msgStr } = i18n;

    const authButtonId = "authenticateWebAuthnButton";

    useScript({ authButtonId, kcContext, i18n });

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("wrTitle")}>
            <div className="-mt-0.5 flex flex-col gap-1.5">
                {/* Keycloak's script fills these after the browser creates the credential, then posts the form. */}
                <form autoComplete="off" id="register" action={url.loginAction} method="post" className="hidden">
                    <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
                    <input type="hidden" id="attestationObject" name="attestationObject" />
                    <input type="hidden" id="publicKeyCredentialId" name="publicKeyCredentialId" />
                    <input type="hidden" id="authenticatorLabel" name="authenticatorLabel" />
                    <input type="hidden" id="transports" name="transports" />
                    <input type="hidden" id="error" name="error" />
                    {/* The design has no "sign out other sessions" box; keep Keycloak's default (on). */}
                    <input type="hidden" name="logout-sessions" value="on" />
                </form>

                <Button type="button" size="form" block id={authButtonId} value={msgStr("doRegisterSecurityKey")}>
                    {msgStr("wrSubmit")}
                </Button>

                {!isSetRetry && isAppInitiatedAction && (
                    <form autoComplete="off" action={url.loginAction} id="kc-webauthn-settings-form" method="post">
                        <Button type="submit" variant="plain" size="form" block id="cancelWebAuthnAIA" name="cancel-aia" value="true">
                            {msgStr("upCancel")}
                        </Button>
                    </form>
                )}
            </div>
        </Template>
    );
}
