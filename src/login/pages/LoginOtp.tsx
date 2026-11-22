import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import { CredentialPicker } from "../CredentialPicker";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginOtp(props: PageProps<Extract<KcContext, { pageId: "login-otp.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { otpLogin, url, messagesPerField } = kcContext;

    const { msg, msgStr } = i18n;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const credentials = otpLogin.userOtpCredentials;
    const selectedId = otpLogin.selectedCredentialId ?? credentials[0]?.id;
    const hasError = messagesPerField.existsError("totp");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={msg("lgSubmit")}
        >
            <form
                autoComplete="off"
                id="kc-otp-login-form"
                action={url.loginAction}
                onSubmit={() => {
                    setIsSubmitting(true);
                    return true;
                }}
                method="post"
                className="-mt-0.5 flex flex-col text-left"
            >
                {credentials.length > 1 && (
                    <CredentialPicker credentials={credentials} selectedId={selectedId} ariaLabel={msgStr("otDevice")} className="mb-6" />
                )}

                <Field size="lg">
                    <FieldLabel htmlFor="otp">{msg("otCode")}</FieldLabel>
                    <Input
                        size="lg"
                        id="otp"
                        name="otp"
                        type="text"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        autoFocus
                        className="tracking-[0.12em]"
                        aria-invalid={hasError}
                    />
                    {hasError && (
                        <FieldError id="input-error-otp-code" aria-live="polite" className="ps-0.5">
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("totp")) }} />
                        </FieldError>
                    )}
                </Field>

                <Button size="form" block name="login" id="kc-login" type="submit" value={msgStr("doLogIn")} disabled={isSubmitting} className="mt-7">
                    {msgStr("lgSubmit")}
                </Button>
            </form>
        </Template>
    );
}
