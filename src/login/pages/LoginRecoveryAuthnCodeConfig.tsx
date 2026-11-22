import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { useScript } from "keycloakify/login/pages/LoginRecoveryAuthnCodeConfig.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginRecoveryAuthnCodeConfig(props: PageProps<Extract<KcContext, { pageId: "login-recovery-authn-code-config.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, recoveryAuthnCodesConfigBean, isAppInitiatedAction } = kcContext;

    const { msg, msgStr } = i18n;

    const [isConfirmed, setIsConfirmed] = useState(false);

    const olRecoveryCodesListId = "kc-recovery-codes-list";

    // Wires up Keycloak's print / download / copy buttons by their ids.
    useScript({ olRecoveryCodesListId, i18n });

    const utilityClass = "text-[13px] leading-tight font-medium text-muted-foreground hover:text-foreground";

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("rcTitle")}>
            <div className="-mt-2.5 flex flex-col items-center text-left">
                <p className="w-full rounded-xl bg-[#ff9500]/10 px-3.5 py-3 text-[13.5px] leading-[1.45] text-[#c93400] dark:bg-[#ff9f0a]/14 dark:text-[#ff9f0a]">
                    <span className="font-semibold">{msg("rcWarnTitle")}</span> {msg("rcWarnText")}
                </p>

                <ol
                    id={olRecoveryCodesListId}
                    className="mt-4 grid w-full grid-cols-2 gap-x-5 gap-y-2 rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] px-5 py-4 font-mono text-[13.5px] leading-[1.2] dark:border-white/14 dark:bg-white/5"
                >
                    {recoveryAuthnCodesConfigBean.generatedRecoveryAuthnCodesList.map((code, index) => (
                        <li key={index} className="tabular-nums">
                            <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
                            {code.slice(0, 4)}-{code.slice(4, 8)}-{code.slice(8)}
                        </li>
                    ))}
                </ol>

                <div className="mt-3.5 flex justify-center gap-6">
                    <button id="printRecoveryCodes" type="button" className={utilityClass}>
                        {msg("rcPrint")}
                    </button>
                    <button id="downloadRecoveryCodes" type="button" className={utilityClass}>
                        {msg("rcDownload")}
                    </button>
                    <button id="copyRecoveryCodes" type="button" className={utilityClass}>
                        {msg("rcCopy")}
                    </button>
                </div>

                {/* The design keeps this text gray (#6e6e73) in dark mode too. */}
                <div className="mt-4 flex w-full flex-col gap-2 text-[13px] leading-[1.45] text-[#6e6e73]">
                    <p>{msg("rcInfo1")}</p>
                    <p>{msg("rcInfo2")}</p>
                </div>

                <label
                    htmlFor="kcRecoveryCodesConfirmationCheck"
                    className="mt-5 flex w-full cursor-pointer items-start gap-2.5 text-sm leading-[1.4] text-muted-foreground"
                >
                    <Checkbox
                        id="kcRecoveryCodesConfirmationCheck"
                        name="kcRecoveryCodesConfirmationCheck"
                        checked={isConfirmed}
                        onCheckedChange={checked => setIsConfirmed(checked === true)}
                        className="mt-0.5"
                    />
                    {msg("rcConfirm")}
                </label>

                <form
                    autoComplete="off"
                    action={url.loginAction}
                    id="kc-recovery-codes-settings-form"
                    method="post"
                    className="mt-6 flex w-full flex-col gap-1.5"
                >
                    <input
                        type="hidden"
                        name="generatedRecoveryAuthnCodes"
                        value={recoveryAuthnCodesConfigBean.generatedRecoveryAuthnCodesAsString}
                    />
                    <input type="hidden" name="generatedAt" value={recoveryAuthnCodesConfigBean.generatedAt} />
                    <input type="hidden" id="userLabel" name="userLabel" value={msgStr("recovery-codes-label-default")} />
                    {/* Keycloak's default: setting up recovery codes signs out the other sessions. */}
                    <input type="hidden" name="logout-sessions" value="on" />

                    <Button
                        type="submit"
                        size="form"
                        block
                        id="saveRecoveryAuthnCodesBtn"
                        value={msgStr("recovery-codes-action-complete")}
                        disabled={!isConfirmed}
                    >
                        {msgStr("rcSubmit")}
                    </Button>
                    {isAppInitiatedAction && (
                        <Button type="submit" variant="plain" size="form" block id="cancelRecoveryAuthnCodesBtn" name="cancel-aia" value="true">
                            {msgStr("rcCancel")}
                        </Button>
                    )}
                </form>
            </div>
        </Template>
    );
}
