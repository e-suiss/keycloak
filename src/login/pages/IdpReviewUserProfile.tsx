import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { JSX } from "keycloakify/tools/JSX";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

type IdpReviewUserProfileProps = PageProps<Extract<KcContext, { pageId: "idp-review-user-profile.ftl" }>, I18n> & {
    UserProfileFormFields: LazyOrNot<(props: Omit<UserProfileFormFieldsProps, "kcClsx">) => JSX.Element>;
    doMakeUserConfirmPassword: boolean;
};

export default function IdpReviewUserProfile(props: IdpReviewUserProfileProps) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes, UserProfileFormFields, doMakeUserConfirmPassword } = props;

    const { msg, msgStr } = i18n;

    const { url, messagesPerField } = kcContext;

    const [isFomSubmittable, setIsFomSubmittable] = useState(false);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={messagesPerField.exists("global")}
            headerNode={msg("irTitle")}
        >
            <form autoComplete="off" id="kc-idp-review-profile-form" action={url.loginAction} method="post" className="flex flex-col gap-4">
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    onIsFormSubmittableValueChange={setIsFomSubmittable}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />
                <div className="mt-3 flex flex-col gap-1.5">
                    <Button size="form" block type="submit" value={msgStr("doSubmit")} disabled={!isFomSubmittable}>
                        {msgStr("doSubmit")}
                    </Button>
                    <Button variant="plain" size="form" block asChild>
                        <a href={url.loginRestartFlowUrl}>{msgStr("irCancel")}</a>
                    </Button>
                </div>
            </form>
        </Template>
    );
}
