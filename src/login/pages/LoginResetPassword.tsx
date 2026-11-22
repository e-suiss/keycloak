import { CaretRightIcon } from "@phosphor-icons/react";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginResetPassword(props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, auth, messagesPerField } = kcContext;

    const { msg, msgStr } = i18n;

    const hasError = messagesPerField.existsError("username");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={msg("rpTitle")}
        >
            <div className="-mt-1.5 flex flex-col items-center">
                <form autoComplete="off" id="kc-reset-password-form" action={url.loginAction} method="post" className="w-full text-left">
                    <Field size="lg">
                        <FieldLabel htmlFor="username">{msg("rpPhone")}</FieldLabel>
                        {/* Same phone field as the login page: +90 prefix, 10 national digits. */}
                        <InputGroup size="lg">
                            <InputGroupAddon>
                                <InputGroupText className="text-foreground">+90</InputGroupText>
                                <span aria-hidden="true" className="ms-1 me-1.5 h-5.5 w-px bg-border" />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="username"
                                name="username"
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                autoFocus
                                autoComplete="off"
                                placeholder="5XX XXX XX XX"
                                defaultValue={auth.attemptedUsername ?? ""}
                                aria-invalid={hasError}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    const v = el.value.replace(/[^0-9]/g, "").slice(0, 10);
                                    if (v !== el.value) el.value = v;
                                }}
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupButton variant="default" size="icon" type="submit" aria-label={msgStr("doSubmit")}>
                                    <CaretRightIcon weight="bold" className="size-4" />
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        {hasError && (
                            <FieldError id="input-error-username" aria-live="polite" className="ps-0.5">
                                <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("username")) }} />
                            </FieldError>
                        )}
                    </Field>
                </form>

                <a href={url.loginUrl} className="mt-7 text-sm leading-tight font-medium text-primary hover:underline">
                    {msg("rpBack")}
                </a>
            </div>
        </Template>
    );
}
