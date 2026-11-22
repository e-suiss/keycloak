import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { ReactNode } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

// Same look as the scope list on the OAuth grant page: one card, rows split by an inset line.
function Row(props: { label: ReactNode; id: string; children: ReactNode }) {
    return (
        <li className="relative flex flex-col gap-1 px-4 py-3.5 not-first:before:absolute not-first:before:inset-x-0 not-first:before:start-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-[#e5e5ea] dark:not-first:before:bg-[#38383a]">
            <span className="text-[13px] leading-tight text-[#86868b]">{props.label}</span>
            <span id={props.id} className="text-base leading-tight wrap-break-word">
                {props.children}
            </span>
        </li>
    );
}

export default function LoginX509Info(props: PageProps<Extract<KcContext, { pageId: "login-x509-info.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, x509 } = kcContext;

    const { msg, msgStr } = i18n;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} headerNode={msg("xiTitle")}>
            <form autoComplete="off" id="kc-x509-login-info" action={url.loginAction} method="post" className="-mt-1.5 flex flex-col">
                <ul className="w-full rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]">
                    <Row label={msg("xiCertificate")} id="certificate_subjectDN">
                        {x509.formData.subjectDN ? x509.formData.subjectDN : msg("noCertificate")}
                    </Row>
                    {x509.formData.isUserEnabled && (
                        <Row label={msg("xiLogin")} id="username">
                            {x509.formData.username}
                        </Row>
                    )}
                </ul>

                <div className="mt-7 flex flex-col gap-1.5">
                    <Button size="form" block name="login" id="kc-login" type="submit" value={msgStr("doContinue")}>
                        {msgStr("doContinue")}
                    </Button>
                    {x509.formData.isUserEnabled && (
                        <Button
                            variant="secondary"
                            size="form"
                            block
                            name="cancel"
                            id="kc-cancel"
                            type="submit"
                            value={msgStr("doIgnore")}
                            className="bg-[#e8e8ed] hover:bg-[#e8e8ed]/80 dark:bg-[#2c2c2e] dark:hover:bg-[#2c2c2e]/80"
                        >
                            {msgStr("doIgnore")}
                        </Button>
                    )}
                </div>
            </form>
        </Template>
    );
}
