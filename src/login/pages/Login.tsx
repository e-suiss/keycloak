import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { FieldError } from "@ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { useScript } from "keycloakify/login/pages/Login.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";
import { isAdminLogin } from "../isAdminLogin";
import { SocialButton } from "../SocialButton";

export default function Login(props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { social, realm, url, usernameHidden, login, auth, registrationDisabled, messagesPerField, enableWebAuthnConditionalUI, authenticators } =
        kcContext;

    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

    const webAuthnButtonId = "authenticateWebAuthnButton";

    useScript({ webAuthnButtonId, kcContext, i18n });

    const hasError = messagesPerField.existsError("username", "password");
    const showRememberMe = realm.rememberMe && !usernameHidden;
    const providers = realm.password ? (social?.providers ?? []) : [];
    const isPhoneLogin = !isAdminLogin(kcContext);
    const showForgot = isPhoneLogin && realm.resetPasswordAllowed;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={msg("lgTitle")}
            displayInfo={isPhoneLogin && realm.password && realm.registrationAllowed && !registrationDisabled}
            infoNode={
                <span id="kc-registration">
                    {msg("lgNoAccount")}{" "}
                    <a tabIndex={8} href={url.registrationUrl} className="font-medium text-primary hover:underline">
                        {msg("lgRegister")}
                    </a>
                </span>
            }
        >
            <div className="flex flex-col">
                {realm.password && (
                    <form
                        autoComplete="off"
                        id="kc-form-login"
                        onSubmit={() => {
                            setIsLoginButtonDisabled(true);
                            return true;
                        }}
                        action={url.loginAction}
                        method="post"
                        className="flex flex-col gap-3.5"
                    >
                        {!usernameHidden && !isPhoneLogin && (
                            <InputGroup size="lg">
                                <InputGroupInput
                                    tabIndex={2}
                                    id="username"
                                    name="username"
                                    defaultValue={login.username ?? ""}
                                    type="text"
                                    autoFocus
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder={msgStr("usernameOrEmail")}
                                    aria-label={msgStr("usernameOrEmail")}
                                    autoComplete="off"
                                    aria-invalid={hasError}
                                />
                            </InputGroup>
                        )}
                        {!usernameHidden && isPhoneLogin && (
                            <InputGroup size="lg">
                                <InputGroupAddon>
                                    <InputGroupText className="text-foreground">+90</InputGroupText>
                                    <span aria-hidden="true" className="ms-1 me-1.5 h-5.5 w-px bg-border" />
                                </InputGroupAddon>
                                <InputGroupInput
                                    tabIndex={2}
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
                            </InputGroup>
                        )}

                        <InputGroup size="lg">
                            <InputGroupInput
                                tabIndex={3}
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="off"
                                placeholder={msgStr("lgPassword")}
                                aria-label={msgStr("lgPassword")}
                                aria-invalid={hasError}
                            />
                            <InputGroupAddon align="inline-end">
                                <input type="hidden" id="id-hidden-input" name="credentialId" value={auth.selectedCredential} />
                                <InputGroupButton
                                    variant="default"
                                    size="icon"
                                    tabIndex={4}
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
                            <FieldError id="input-error" aria-live="polite" className="-mt-1.5 text-left">
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: kcSanitize(messagesPerField.getFirstError("username", "password"))
                                    }}
                                />
                            </FieldError>
                        )}

                        {(showRememberMe || showForgot) && (
                            <div className="mt-1 flex items-center justify-between gap-3 text-[15px] leading-tight">
                                {showRememberMe ? (
                                    <label htmlFor="rememberMe" className="flex cursor-pointer items-center gap-2.5">
                                        <Checkbox tabIndex={5} id="rememberMe" name="rememberMe" defaultChecked={!!login.rememberMe} />
                                        {msg("lgRemember")}
                                    </label>
                                ) : (
                                    <span />
                                )}
                                {showForgot && (
                                    <a tabIndex={6} href={url.loginResetCredentialsUrl} className="font-medium text-primary hover:underline">
                                        {msg("lgForgot")}
                                    </a>
                                )}
                            </div>
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
                        <form autoComplete="off" id="webauth" action={url.loginAction} method="post">
                            <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
                            <input type="hidden" id="authenticatorData" name="authenticatorData" />
                            <input type="hidden" id="signature" name="signature" />
                            <input type="hidden" id="credentialId" name="credentialId" />
                            <input type="hidden" id="userHandle" name="userHandle" />
                            <input type="hidden" id="error" name="error" />
                        </form>
                        {authenticators !== undefined && authenticators.authenticators.length !== 0 && (
                            <form autoComplete="off" id="authn_select">
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
