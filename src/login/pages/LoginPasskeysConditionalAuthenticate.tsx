import { Button } from "@ui/components/button";
import { useScript } from "keycloakify/login/pages/LoginPasskeysConditionalAuthenticate.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { AuthenticatorList } from "../AuthenticatorList";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginPasskeysConditionalAuthenticate(
    props: PageProps<Extract<KcContext, { pageId: "login-passkeys-conditional-authenticate.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, shouldDisplayAuthenticators, authenticators, registrationDisabled, realm } = kcContext;

    const { msg, msgStr } = i18n;

    const authButtonId = "authenticateWebAuthnButton";

    useScript({ authButtonId, kcContext, i18n });

    const list = authenticators?.authenticators ?? [];
    const showList = shouldDisplayAuthenticators && list.length !== 0;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("pkTitle")}>
            {/* One root: the Template spaces its children, and these hidden forms must not take a slot. */}
            <div className={`flex flex-col items-center ${showList ? "-mt-1.5" : "-mt-0.5"}`}>
                <form autoComplete="off" id="webauth" className="hidden" action={url.loginAction} method="post">
                    <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
                    <input type="hidden" id="authenticatorData" name="authenticatorData" />
                    <input type="hidden" id="signature" name="signature" />
                    <input type="hidden" id="credentialId" name="credentialId" />
                    <input type="hidden" id="userHandle" name="userHandle" />
                    <input type="hidden" id="error" name="error" />
                </form>

                {list.length !== 0 && (
                    <form autoComplete="off" id="authn_select" className="hidden">
                        {list.map((authenticator, i) => (
                            <input key={i} type="hidden" name="authn_use_chk" readOnly value={authenticator.credentialId} />
                        ))}
                    </form>
                )}

                {showList && <AuthenticatorList authenticators={list} i18n={i18n} />}

                {/* The only way in: Keycloak's script would reveal an autofill username field on capable browsers,
                    but the design has none, and clicking the button cancels any pending autofill request. */}
                <div id="kc-form-passkey-button" className={`w-full ${showList ? "mt-7" : ""}`}>
                    <Button id={authButtonId} type="button" value={msgStr("passkey-doAuthenticate")} size="form" block>
                        {msgStr("pkSubmit")}
                    </Button>
                </div>

                {realm.registrationAllowed && !registrationDisabled && (
                    <p id="kc-registration" className="mt-5.5 text-sm leading-tight text-muted-foreground">
                        {msg("pkNoAccount")}{" "}
                        <a href={url.registrationUrl} className="font-medium text-primary hover:underline">
                            {msg("pkRegister")}
                        </a>
                    </p>
                )}
            </div>
        </Template>
    );
}
