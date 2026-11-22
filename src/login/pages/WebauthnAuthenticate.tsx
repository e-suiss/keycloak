import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useScript } from "keycloakify/login/pages/WebauthnAuthenticate.useScript";
import { AuthenticatorList } from "../AuthenticatorList";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function WebauthnAuthenticate(props: PageProps<Extract<KcContext, { pageId: "webauthn-authenticate.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, realm, registrationDisabled, authenticators, shouldDisplayAuthenticators } = kcContext;

    const { msg, msgStr } = i18n;

    const authButtonId = "authenticateWebAuthnButton";

    useScript({ authButtonId, kcContext, i18n });

    const list = authenticators?.authenticators ?? [];
    const showList = shouldDisplayAuthenticators && list.length !== 0;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            headerNode={msg("waTitle")}
            displayInfo={realm.registrationAllowed && !registrationDisabled}
            infoNode={
                <span id="kc-registration">
                    {msg("lgNoAccount")}{" "}
                    <a href={url.registrationUrl} className="font-medium text-primary hover:underline">
                        {msg("lgRegister")}
                    </a>
                </span>
            }
        >
            {/* One root: the Template spaces its children, and these hidden forms must not take a slot. */}
            <div id="kc-form-webauthn" className={`flex flex-col items-center ${showList ? "-mt-1.5" : "-mt-0.5"}`}>
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
                        {list.map(authenticator => (
                            <input key={authenticator.credentialId} type="hidden" name="authn_use_chk" value={authenticator.credentialId} />
                        ))}
                    </form>
                )}

                {showList && <AuthenticatorList authenticators={list} i18n={i18n} />}

                <Button
                    id={authButtonId}
                    type="button"
                    value={msgStr("webauthn-doAuthenticate")}
                    size="form"
                    block
                    className={showList ? "mt-7" : undefined}
                >
                    {msgStr("waSubmit")}
                </Button>
            </div>
        </Template>
    );
}
