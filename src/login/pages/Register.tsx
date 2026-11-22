import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { JSX } from "keycloakify/tools/JSX";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import { useRef, useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext, Term } from "../KcContext";
import { SocialButton } from "../SocialButton";
import { TermsList } from "../TermsList";

type RegisterProps = PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n> & {
    UserProfileFormFields: LazyOrNot<(props: UserProfileFormFieldsProps) => JSX.Element>;
    doMakeUserConfirmPassword: boolean;
};

/**
 * Registration step 1: only the phone number (it becomes the username), plus any terms the server sends.
 * Identity, e-mail and password are collected later by the "complete-registration" required action.
 */
export default function Register(props: RegisterProps) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, messagesPerField, social } = kcContext;
    const terms: Term[] = kcContext.terms ?? [];
    const providers = social?.providers ?? [];

    const { msg, msgStr } = i18n;

    const formRef = useRef<HTMLFormElement>(null);
    const [errors, setErrors] = useState<{ phone?: string; terms?: string }>({});
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    const phoneValue = () => (formRef.current?.elements.namedItem("phoneNumber") as HTMLInputElement | null)?.value.trim() ?? "";

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        const next: typeof errors = {};
        if (!/^5[0-9]{9}$/.test(phoneValue())) next.phone = msgStr("rgPhoneInvalid");
        if (terms.some(t => t.required && !checked[t.key])) next.terms = msgStr("rgTermsRequired");

        setErrors(next);
        if (next.phone || next.terms) {
            e.preventDefault();
            return;
        }
        const username = formRef.current?.elements.namedItem("username") as HTMLInputElement | null;
        if (username) username.value = phoneValue();
    };

    const serverPhoneError = messagesPerField.existsError("phoneNumber", "username")
        ? messagesPerField.getFirstError("phoneNumber", "username")
        : undefined;
    const hasPhoneError = errors.phone !== undefined || serverPhoneError !== undefined;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            headerNode={msg("rgTitle")}
            displayMessage={!messagesPerField.existsError("phoneNumber", "username")}
            displayInfo
            infoNode={
                <span>
                    {msg("rgHaveAccount")}{" "}
                    <a href={url.loginUrl} className="font-medium text-primary hover:underline">
                        {msg("rgLogin")}
                    </a>
                </span>
            }
        >
            <div className="-mt-0.5 flex flex-col">
                <form autoComplete="off"
                    id="kc-register-form"
                    ref={formRef}
                    action={url.registrationAction}
                    method="post"
                    onSubmit={onSubmit}
                    className="flex flex-col text-left"
                >
                    <input type="hidden" id="username" name="username" />

                    <Field size="lg">
                        <FieldLabel htmlFor="phoneNumber">{msg("rgPhone")}</FieldLabel>
                        {/* Same phone field as the login page: +90 prefix, 10 national digits. */}
                        <InputGroup size="lg">
                            <InputGroupAddon>
                                <InputGroupText className="text-foreground">+90</InputGroupText>
                                <span aria-hidden="true" className="ms-1 me-1.5 h-5.5 w-px bg-border" />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                autoFocus
                                autoComplete="off"
                                placeholder="5XX XXX XX XX"
                                aria-invalid={hasPhoneError}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    const v = el.value.replace(/[^0-9]/g, "").slice(0, 10);
                                    if (v !== el.value) el.value = v;
                                }}
                            />
                        </InputGroup>
                        {hasPhoneError && (
                            <FieldError id="input-error-phone" aria-live="polite" className="ps-0.5">
                                {errors.phone ?? <span dangerouslySetInnerHTML={{ __html: kcSanitize(serverPhoneError ?? "") }} />}
                            </FieldError>
                        )}
                    </Field>

                    {terms.length !== 0 && (
                        <TermsList
                            terms={terms}
                            checked={checked}
                            onCheckedChange={(key, value) => setChecked(c => ({ ...c, [key]: value }))}
                            acceptLabel={msgStr("rgAccept")}
                            error={errors.terms}
                            className="mt-5.5"
                        />
                    )}

                    <Button type="submit" size="form" block className="mt-7">
                        {msgStr("doContinue")}
                    </Button>
                </form>

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
            </div>
        </Template>
    );
}
