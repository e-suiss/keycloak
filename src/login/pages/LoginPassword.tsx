import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { FieldError } from "@ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { useScript } from "keycloakify/login/pages/LoginPassword.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginPassword(props: PageProps<Extract<KcContext, { pageId: "login-password.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { realm, url, messagesPerField, enableWebAuthnConditionalUI, authenticators } = kcContext;

    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

    const webAuthnButtonId = "authenticateWebAuthnButton";

    useScript({ webAuthnButtonId, kcContext, i18n });

    const hasError = messagesPerField.existsError("password");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            headerNode={msg("lpTitle")}
            displayMessage={!hasError}
        >
            <div className="-mt-1 flex flex-col items-center">
                <form
                    autoComplete="off"
                    id="kc-form-login"
                    onSubmit={() => {
                        setIsLoginButtonDisabled(true);
                        return true;
                    }}
                    action={url.loginAction}
                    method="post"
                    className="flex w-full flex-col"
                >
                    <InputGroup size="lg">
                        <InputGroupInput
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="off"
                            autoFocus
                            placeholder={msgStr("lgPassword")}
                            aria-label={msgStr("lgPassword")}
                            aria-invalid={hasError}
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                variant="default"
                                size="icon"
                                disabled={isLoginButtonDisabled}
                                name="login"
                                id="kc-login"
                                type="submit"
                                aria-label={msgStr("lgSubmit")}
                            >
                                <CaretRightIcon weight="bold" className="size-4" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>

                    {hasError && (
                        <FieldError id="input-error-password" aria-live="polite" className="mt-2 ps-0.5 text-left">
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("password")) }} />
                        </FieldError>
                    )}
                </form>

                {realm.resetPasswordAllowed && (
                    <a href={url.loginResetCredentialsUrl} className="mt-5.5 text-[15px] leading-tight font-medium text-primary hover:underline">
                        {msg("lgForgot")}
                    </a>
                )}

                {enableWebAuthnConditionalUI && (
                    <>
                        <form autoComplete="off" id="webauth" action={url.loginAction} method="post" className="hidden">
                            <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
                            <input type="hidden" id="authenticatorData" name="authenticatorData" />
                            <input type="hidden" id="signature" name="signature" />
                            <input type="hidden" id="credentialId" name="credentialId" />
                            <input type="hidden" id="userHandle" name="userHandle" />
                            <input type="hidden" id="error" name="error" />
                        </form>
                        {authenticators !== undefined && authenticators.authenticators.length !== 0 && (
                            <form autoComplete="off" id="authn_select" className="hidden">
                                {authenticators.authenticators.map((authenticator, i) => (
                                    <input key={i} type="hidden" name="authn_use_chk" readOnly value={authenticator.credentialId} />
                                ))}
                            </form>
                        )}
                        <Button
                            id={webAuthnButtonId}
                            type="button"
                            variant="secondary"
                            size="form"
                            block
                            className="mt-7"
                            value={msgStr("passkey-doAuthenticate")}
                        >
                            {msgStr("passkey-doAuthenticate")}
                        </Button>
                    </>
                )}
            </div>
        </Template>
    );
}
