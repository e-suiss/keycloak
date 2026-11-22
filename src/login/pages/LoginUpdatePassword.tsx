import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { InputGroupInput } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";
import { PasswordWrapper } from "../PasswordWrapper";

export default function LoginUpdatePassword(props: PageProps<Extract<KcContext, { pageId: "login-update-password.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msg, msgStr } = i18n;

    const { url, messagesPerField, isAppInitiatedAction } = kcContext;

    const hasError = messagesPerField.existsError("password", "password-confirm");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={msg("upTitle")}
        >
            <form
                autoComplete="off"
                id="kc-passwd-update-form"
                action={url.loginAction}
                method="post"
                className="-mt-1.5 flex flex-col gap-5.5 text-left"
            >
                <Field size="lg">
                    <FieldLabel htmlFor="password-new">{msg("upNew")}</FieldLabel>
                    <PasswordWrapper i18n={i18n} passwordInputId="password-new">
                        <InputGroupInput type="password" id="password-new" name="password-new" autoComplete="off" autoFocus aria-invalid={hasError} />
                    </PasswordWrapper>
                    {messagesPerField.existsError("password") && (
                        <FieldError id="input-error-password" aria-live="polite" className="ps-0.5">
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("password")) }} />
                        </FieldError>
                    )}
                </Field>

                <Field size="lg">
                    <FieldLabel htmlFor="password-confirm">{msg("upConfirm")}</FieldLabel>
                    <PasswordWrapper i18n={i18n} passwordInputId="password-confirm">
                        <InputGroupInput type="password" id="password-confirm" name="password-confirm" autoComplete="off" aria-invalid={hasError} />
                    </PasswordWrapper>
                    {messagesPerField.existsError("password-confirm") && (
                        <FieldError id="input-error-password-confirm" aria-live="polite" className="ps-0.5">
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("password-confirm")) }} />
                        </FieldError>
                    )}
                </Field>

                {/* Keycloak's default: changing the password signs out the other sessions. */}
                <input type="hidden" name="logout-sessions" value="on" />

                <div className="mt-1.5 flex flex-col gap-1.5">
                    <Button size="form" block type="submit" value={msgStr("doSubmit")}>
                        {msgStr("upSubmit")}
                    </Button>
                    {isAppInitiatedAction && (
                        <Button variant="plain" size="form" block type="submit" name="cancel-aia" value="true">
                            {msgStr("upCancel")}
                        </Button>
                    )}
                </div>
            </form>
        </Template>
    );
}
