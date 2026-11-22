import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { FieldError } from "@ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { useScript } from "keycloakify/login/pages/LoginUsername.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";
import { SocialButton } from "../SocialButton";

export default function LoginUsername(props: PageProps<Extract<KcContext, { pageId: "login-username.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { social, realm, url, usernameHidden, login, registrationDisabled, messagesPerField, enableWebAuthnConditionalUI, authenticators } =
        kcContext;

    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

    const webAuthnButtonId = "authenticateWebAuthnButton";

    useScript({ webAuthnButtonId, kcContext, i18n });

    const hasError = messagesPerField.existsError("username");
    const providers = realm.password ? (social?.providers ?? []) : [];

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={msg("lgTitle")}
            displayInfo={realm.password && realm.registrationAllowed && !registrationDisabled}
            infoNode={
                <span id="kc-registration">
                    {msg("lgNoAccount")}{" "}
                    <a href={url.registrationUrl} className="font-medium text-primary hover:underline">
                        {msg("lgRegister")}
                    </a>
                </span>
            }
        >
            <div className="flex flex-col">
                {realm.password && !usernameHidden && (
                    <form
                        autoComplete="off"
                        id="kc-form-login"
                        onSubmit={() => {
                            setIsLoginButtonDisabled(true);
                            return true;
                        }}
                        action={url.loginAction}
                        method="post"
                        className="flex flex-col"
                    >
                        {/* Same phone field as the login page: +90 prefix, 10 national digits, submit arrow inside. */}
                        <InputGroup size="lg">
                            <InputGroupAddon>
                                <InputGroupText className="text-foreground">+90</InputGroupText>
                                <span aria-hidden="true" className="ms-1 me-1.5 h-5.5 w-px bg-border" />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="username"
                                name="username"
                                defaultValue={login.username ?? ""}
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                autoFocus
                                placeholder="5XX XXX XX XX"
                                aria-label={msgStr("loginPhoneLabel")}
                                autoComplete={enableWebAuthnConditionalUI ? "username webauthn" : "off"}
                                aria-invalid={hasError}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    const v = el.value.replace(/[^0-9]/g, "").slice(0, 10);
                                    if (v !== el.value) el.value = v;
                                }}
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
                            <FieldError id="input-error" aria-live="polite" className="mt-2 ps-0.5 text-left">
                                <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.getFirstError("username")) }} />
                            </FieldError>
                        )}
                    </form>
                )}

                {providers.length !== 0 && (
                    <div id="kc-social-providers" className="mt-7 flex flex-col gap-7">
                        <div className="flex items-center gap-3 text-[13px] leading-tight text-muted-foreground">
                            <span aria-hidden="true" className="h-px flex-1 bg-foreground/10 dark:bg-foreground/12" />
                            {msg("lgOr")}
                            <span aria-hidden="true" className="h-px flex-1 bg-foreground/10 dark:bg-foreground/12" />
                        </div>
                        <ul className="flex flex-col gap-2">
                            {providers.map(p => (
                                <li key={p.alias}>
                                    <SocialButton provider={p} label={msgStr("lgSocial", p.displayName)} />
                                </li>
                            ))}
                        </ul>
                    </div>
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
