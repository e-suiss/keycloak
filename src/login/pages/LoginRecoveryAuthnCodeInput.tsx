import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginRecoveryAuthnCodeInput(props: PageProps<Extract<KcContext, { pageId: "login-recovery-authn-code-input.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, messagesPerField, recoveryAuthnCodesInputBean } = kcContext;

    const { msg, msgStr } = i18n;

    const hasError = messagesPerField.existsError("recoveryCodeInput");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            headerNode={msg("riTitle")}
            displayMessage={!hasError}
        >
            <form
                autoComplete="off"
                id="kc-recovery-code-login-form"
                action={url.loginAction}
                method="post"
                className="-mt-1.5 flex flex-col gap-7 text-left"
            >
                <Field size="lg">
                    <FieldLabel htmlFor="recoveryCodeInput">{msg("riLabel", `${recoveryAuthnCodesInputBean.codeNumber}`)}</FieldLabel>
                    <Input
                        size="lg"
                        id="recoveryCodeInput"
                        name="recoveryCodeInput"
                        type="text"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoFocus
                        className="font-mono data-[size=lg]:text-base tracking-[0.05em]"
                        aria-invalid={hasError}
                    />
                    {hasError && (
                        <FieldError id="input-error" aria-live="polite" className="ps-0.5">
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("recoveryCodeInput")) }} />
                        </FieldError>
                    )}
                </Field>

                <Button size="form" block name="login" id="kc-login" type="submit" value={msgStr("doLogIn")}>
                    {msgStr("lgSubmit")}
                </Button>
            </form>
        </Template>
    );
}
