import { CaretRightIcon, DeviceMobileIcon, FingerprintIcon, LockIcon, PasswordIcon } from "@phosphor-icons/react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

// Keycloak names each method's icon with a class key; map the known ones to our icon set.
const icons: Record<string, typeof LockIcon> = {
    kcAuthenticatorPasswordClass: PasswordIcon,
    kcAuthenticatorOTPClass: DeviceMobileIcon,
    kcAuthenticatorWebAuthnClass: FingerprintIcon,
    kcAuthenticatorWebAuthnPasswordlessClass: FingerprintIcon
};

export default function SelectAuthenticator(props: PageProps<Extract<KcContext, { pageId: "select-authenticator.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, auth } = kcContext;

    const { msg, advancedMsg, advancedMsgStr } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("saTitle")}>
            {/* Separate input-styled boxes, like the method boxes on the OTP page. */}
            <form autoComplete="off" id="kc-select-credential-form" action={url.loginAction} method="post" className="-mt-0.5 flex flex-col gap-2">
                {auth.authenticationSelections.map((selection, i) => {
                    const Icon = (selection.iconCssClass && icons[selection.iconCssClass]) || LockIcon;
                    return (
                        <button
                            key={i}
                            type="submit"
                            name="authenticationExecution"
                            value={selection.authExecId}
                            className="flex h-16 w-full cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-background px-4 text-left transition-colors outline-none hover:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring dark:bg-foreground/6"
                        >
                            <Icon aria-hidden className="size-5.5 shrink-0 text-primary" />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-[17px] leading-tight">{advancedMsg(selection.displayName)}</span>
                                <span title={advancedMsgStr(selection.helpText)} className="truncate text-[13px] leading-tight text-muted-foreground">
                                    {advancedMsg(selection.helpText)}
                                </span>
                            </span>
                            <CaretRightIcon aria-hidden weight="bold" className="size-3.5 shrink-0 text-muted-foreground/60" />
                        </button>
                    );
                })}
            </form>
        </Template>
    );
}
