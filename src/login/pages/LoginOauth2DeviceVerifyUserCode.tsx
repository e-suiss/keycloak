import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginOauth2DeviceVerifyUserCode(
    props: PageProps<Extract<KcContext, { pageId: "login-oauth2-device-verify-user-code.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, classes, Template } = props;

    const { url, message } = kcContext;

    // Keycloak reports a wrong code as a page message; the design shows it under the field instead.
    const error = message?.type === "error" ? message.summary : undefined;

    const { msg, msgStr } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} displayMessage={error === undefined} headerNode={msg("dvTitle")}>
            <form autoComplete="off"
                id="kc-user-verify-device-user-code-form"
                action={url.oauth2DeviceVerificationAction}
                method="post"
                className="-mt-0.5 flex flex-col gap-7 text-left"
            >
                <Field size="lg">
                    <FieldLabel htmlFor="device-user-code">{msg("dvCode")}</FieldLabel>
                    <Input
                        size="lg"
                        id="device-user-code"
                        name="device_user_code"
                        type="text"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        autoFocus
                        className="tracking-[0.08em]"
                        aria-invalid={error !== undefined}
                        aria-describedby={error !== undefined ? "input-error-device-user-code" : undefined}
                    />
                    {error !== undefined && (
                        <FieldError id="input-error-device-user-code" aria-live="polite" className="ps-0.5">
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(error) }} />
                        </FieldError>
                    )}
                </Field>

                <Button size="form" block type="submit" value={msgStr("doSubmit")}>
                    {msgStr("dvSubmit")}
                </Button>
            </form>
        </Template>
    );
}
