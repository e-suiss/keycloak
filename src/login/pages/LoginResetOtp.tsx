import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { CredentialPicker } from "../CredentialPicker";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginResetOtp(props: PageProps<Extract<KcContext, { pageId: "login-reset-otp.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, messagesPerField, configuredOtpCredentials } = kcContext;

    const { msg, msgStr } = i18n;

    const credentials = configuredOtpCredentials.userOtpCredentials;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("totp")}
            headerNode={msg("lgSubmit")}
        >
            <form autoComplete="off" id="kc-otp-reset-form" action={url.loginAction} method="post" className="flex flex-col items-center">
                {/* The design sets this description apart from the shared one: 15px and 14px under the title. */}
                <p id="kc-otp-reset-form-description" className="-mt-4.5 text-[15px] leading-[1.45] text-muted-foreground">
                    {msg("roDescription")}
                </p>

                <CredentialPicker
                    credentials={credentials}
                    selectedId={configuredOtpCredentials.selectedCredentialId ?? credentials[0]?.id}
                    ariaLabel={msgStr("otDevice")}
                    className="mt-7.5"
                />

                <Button id="kc-otp-reset-form-submit" size="form" block type="submit" value={msgStr("doSubmit")} className="mt-7">
                    {msgStr("ctSubmit")}
                </Button>
            </form>
        </Template>
    );
}
