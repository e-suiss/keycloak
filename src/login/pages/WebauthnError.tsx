import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useRef } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function WebauthnError(props: PageProps<Extract<KcContext, { pageId: "webauthn-error.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, isAppInitiatedAction, execution } = kcContext;

    const { msg, msgStr } = i18n;

    const retryFormRef = useRef<HTMLFormElement>(null);

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("weTitle")}>
            <div className="-mt-0.5 flex flex-col gap-1.5">
                {/* "Try again" re-runs the same execution with isSetRetry=retry. */}
                <form autoComplete="off" id="kc-error-credential-form" ref={retryFormRef} action={url.loginAction} method="post" className="hidden">
                    <input type="hidden" id="executionValue" name="authenticationExecution" value={execution} />
                    <input type="hidden" id="isSetRetry" name="isSetRetry" value="retry" />
                </form>
                <Button
                    type="button"
                    size="form"
                    block
                    name="try-again"
                    id="kc-try-again"
                    value={msgStr("doTryAgain")}
                    onClick={() => retryFormRef.current?.requestSubmit()}
                >
                    {msgStr("weRetry")}
                </Button>
                {isAppInitiatedAction && (
                    <form autoComplete="off" action={url.loginAction} id="kc-webauthn-settings-form" method="post">
                        <Button type="submit" variant="plain" size="form" block id="cancelWebAuthnAIA" name="cancel-aia" value="true">
                            {msgStr("upCancel")}
                        </Button>
                    </form>
                )}
            </div>
        </Template>
    );
}
