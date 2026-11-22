import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { JSX } from "keycloakify/tools/JSX";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

type UpdateEmailProps = PageProps<Extract<KcContext, { pageId: "update-email.ftl" }>, I18n> & {
    UserProfileFormFields: LazyOrNot<(props: Omit<UserProfileFormFieldsProps, "kcClsx">) => JSX.Element>;
    doMakeUserConfirmPassword: boolean;
};

export default function UpdateEmail(props: UpdateEmailProps) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes, UserProfileFormFields, doMakeUserConfirmPassword } = props;

    const { msg, msgStr } = i18n;

    const [isFormSubmittable, setIsFormSubmittable] = useState(false);

    const { url, messagesPerField, isAppInitiatedAction } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={messagesPerField.exists("global")}
            headerNode={msg("ueTitle")}
        >
            <form
                autoComplete="off"
                id="kc-update-email-form"
                action={url.loginAction}
                method="post"
                className="-mt-0.5 flex flex-col gap-5.5 text-left"
            >
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    onIsFormSubmittableValueChange={setIsFormSubmittable}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />

                {/* The design has no "sign out other sessions" box; keep Keycloak's default (on). */}
                <input type="hidden" name="logout-sessions" value="on" />

                <div className="mt-1.5 flex flex-col gap-1.5">
                    <Button disabled={!isFormSubmittable} size="form" block type="submit" value={msgStr("doSubmit")}>
                        {msgStr("doContinue")}
                    </Button>
                    {isAppInitiatedAction && (
                        <Button variant="plain" size="form" block type="submit" name="cancel-aia" value="true" formNoValidate>
                            {msgStr("upCancel")}
                        </Button>
                    )}
                </div>
            </form>
        </Template>
    );
}
