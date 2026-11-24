import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { useInitialize } from "keycloakify/login/Template.useInitialize";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { clsx } from "keycloakify/tools/clsx";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import { type ReactNode, useEffect } from "react";
import type { I18n } from "./i18n";
import type { KcContext } from "./KcContext";
import { isAdminLogin } from "./isAdminLogin";
import { fillSlot } from "./fillSlot";
import { EnvBadge } from "../shared/EnvBadge";
import { BRAND_GRADIENT, Grain } from "../shared/brand";
import logoUrl from "./assets/e-suiss-avatar.png";

export default function Template(props: TemplateProps<KcContext, I18n>) {
    const {
        displayInfo = false,
        displayMessage = true,
        displayRequiredFields = false,
        headerNode,
        socialProvidersNode = null,
        infoNode = null,
        documentTitle,
        bodyClassName,
        kcContext,
        i18n,
        doUseDefaultCss,
        children
    } = props;

    const { msg, msgStr } = i18n;

    const { realm, auth, url, message, isAppInitiatedAction } = kcContext;

    const pageDescription: ReactNode =
        kcContext.pageId === "code.ftl" ? (
            msgStr(kcContext.code.success ? "codeReadyDescription" : "codeFailedDescription")
        ) : kcContext.pageId === "complete-registration.ftl" ? (
            registrationDescription(kcContext, msgStr)
        ) : kcContext.pageId === "delete-account-confirm.ftl" ? (
            sentenceLines(msgStr("daDescription"))
        ) : kcContext.pageId === "delete-credential.ftl" ? (
            msgStr("dcDescription")
        ) : kcContext.pageId === "info.ftl" ? (
            infoDescription(kcContext, i18n)
        ) : kcContext.pageId === "login.ftl" ? (
            msgStr(isAdminLogin(kcContext) ? "lgDescriptionAdmin" : "lgDescription")
        ) : kcContext.pageId === "login-username.ftl" ? (
            msgStr("luDescription")
        ) : kcContext.pageId === "login-password.ftl" ? (
            msgStr("lpDescription")
        ) : kcContext.pageId === "link-idp-action.ftl" ? (
            msgStr("liDescription")
        ) : kcContext.pageId === "login-idp-link-confirm.ftl" ? (
            msgStr("cfDescription")
        ) : kcContext.pageId === "login-oauth2-device-verify-user-code.ftl" ? (
            msgStr("dvDescription")
        ) : kcContext.pageId === "login-idp-link-email.ftl" ? (
            fillSlot(msgStr("leDescription", "{0}"), <span className="text-foreground">{kcContext.brokerContext.username}</span>)
        ) : kcContext.pageId === "login-idp-link-confirm-override.ftl" ? (
            msgStr("coDescription", kcContext.idpDisplayName)
        ) : kcContext.pageId === "login-config-totp.ftl" ? (
            kcContext.mode === "manual" ? (
                msgStr("ctManualDescription")
            ) : undefined
        ) : kcContext.pageId === "webauthn-authenticate.ftl" ? (
            msgStr("waDescription")
        ) : kcContext.pageId === "webauthn-error.ftl" ? (
            msgStr("weDescription")
        ) : kcContext.pageId === "webauthn-register.ftl" ? (
            msgStr("wrDescription")
        ) : kcContext.pageId === "update-email.ftl" ? (
            msgStr("ueDescription")
        ) : kcContext.pageId === "terms.ftl" ? (
            msgStr("tmDescription")
        ) : kcContext.pageId === "terms-reconsent.ftl" ? (
            msgStr("trDescription")
        ) : kcContext.pageId === "select-organization.ftl" ? (
            msgStr("soDescription")
        ) : kcContext.pageId === "select-authenticator.ftl" ? (
            msgStr("saDescription")
        ) : kcContext.pageId === "security-image.ftl" ? (
            kcContext.mode === "CONFIRM" ? (
                msgStr("sgConfirmDescription")
            ) : (
                sentenceLines(msgStr("sgDescription"))
            )
        ) : kcContext.pageId === "saml-post-form.ftl" ? (
            msgStr("spDescription")
        ) : kcContext.pageId === "phone-otp.ftl" ? (
            kcContext.phoneNumber ? (
                fillSlot(msgStr("poDescription", "{0}"), <span className="whitespace-nowrap text-foreground">+90 {kcContext.phoneNumber}</span>)
            ) : undefined
        ) : kcContext.pageId === "register.ftl" ? (
            msgStr("rgDescription")
        ) : kcContext.pageId === "logout-confirm.ftl" ? (
            msgStr("lcDescription")
        ) : kcContext.pageId === "idp-review-user-profile.ftl" ? (
            msgStr("irDescription")
        ) : kcContext.pageId === "frontchannel-logout.ftl" ? (
            sentenceLines(msgStr("flDescription"))
        ) : kcContext.pageId === "error.ftl" ? (
            kcContext.message?.summary ? (
                <span dangerouslySetInnerHTML={{ __html: kcSanitize(kcContext.message.summary) }} />
            ) : (
                sentenceLines(msgStr("erDescription"))
            )
        ) : undefined;

    useEffect(() => {
        document.title = documentTitle ?? msgStr("loginTitle", realm.displayName || realm.name);
    }, [realm.name, realm.displayName, msgStr, documentTitle]);

    useEffect(() => {
        // Follows the system theme unless <html data-theme="light|dark"> pins it (Storybook's theme toolbar).
        const query = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
            const pinned = document.documentElement.dataset.theme;
            document.documentElement.classList.toggle("dark", pinned ? pinned === "dark" : query.matches);
        };
        apply();
        query.addEventListener("change", apply);
        return () => query.removeEventListener("change", apply);
    }, []);

    useEffect(() => {
        // The back button can restore a login page from the browser's back/forward cache exactly as it
        // was left: its submit button still disabled from the last submit and its form carrying the
        // session_code of a step the flow has already passed. Fetch the page again instead: a GET of
        // the same URL, so Keycloak answers with a fresh form (never a form re-post).
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) window.location.replace(window.location.href);
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    useSetClassName({
        qualifiedName: "html",
        className: ""
    });

    useSetClassName({
        qualifiedName: "body",
        className: bodyClassName ?? ""
    });

    const { isReadyToRender } = useInitialize({ kcContext, doUseDefaultCss });

    if (!isReadyToRender) {
        return null;
    }

    const environment = kcContext.properties.ESUISS_ENV;

    return (
        <div className={clsx("relative flex min-h-svh w-full flex-col items-center bg-background px-7.5 text-foreground", "kc-page")}>
            <div
                aria-hidden
                className={clsx(
                    "pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden opacity-35 [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_20%,transparent_75%)] dark:opacity-25",
                    BRAND_GRADIENT
                )}
            >
                <Grain className="z-0" />
            </div>
            <EnvBadge environment={environment} className="absolute top-4 left-6 z-10 md:top-6" />
            <div className="relative flex w-full max-w-85 flex-1 flex-col items-center pt-14 pb-10 md:max-w-100 md:justify-center md:pt-10">
                <main className={clsx("flex w-full flex-col items-center text-center", "kc-card")}>
                    <img src={logoUrl} alt="e-suiss" className="size-11" />
                    {headerNode !== null &&
                        (() => {
                            // On the password step the design shows the number entered before as a chip above the title;
                            // its × restarts the login so another number can be entered. Later steps keep only their title.
                            const showUser = kcContext.pageId === "login-password.ftl" && !!auth?.showUsername && !auth.showResetCredentials;
                            const node = (
                                <>
                                    {showUser && (
                                        <div
                                            id="kc-username"
                                            className="mt-6 flex h-9 max-w-full items-center gap-2 rounded-full border border-[#e5e5ea] bg-[#f5f5f7] ps-4 pe-2 dark:border-[#38383a] dark:bg-[#1c1c1e]"
                                        >
                                            <span id="kc-attempted-username" className="truncate text-[15px] leading-tight tabular-nums">
                                                {formatAttemptedUsername(auth.attemptedUsername)}
                                            </span>
                                            <a
                                                id="reset-login"
                                                href={url.loginRestartFlowUrl}
                                                aria-label={msgStr("restartLoginTooltip")}
                                                title={msgStr("restartLoginTooltip")}
                                                className="grid size-5 shrink-0 place-items-center rounded-full border border-[#d2d2d7] text-[#86868b] hover:text-foreground dark:border-[#48484a]"
                                            >
                                                <XIcon weight="bold" className="size-2.5" />
                                            </a>
                                        </div>
                                    )}
                                    <h1 id="kc-page-title" className={clsx("text-3xl font-semibold tracking-tight", showUser ? "mt-4.5" : "mt-7")}>
                                        {headerNode}
                                    </h1>
                                    {pageDescription !== undefined && (
                                        <p id="kc-page-description" className="mt-2 max-w-72 whitespace-pre-line text-base text-muted-foreground">
                                            {pageDescription}
                                        </p>
                                    )}
                                </>
                            );

                            if (displayRequiredFields) {
                                return (
                                    <>
                                        {node}
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            <span className="required text-destructive">*</span> {msg("requiredFields")}
                                        </p>
                                    </>
                                );
                            }

                            return node;
                        })()}
                    <div id="kc-content" className="mt-8 w-full">
                        <div id="kc-content-wrapper" className="flex flex-col gap-6">
                            {displayMessage && message !== undefined && (message.type !== "warning" || !isAppInitiatedAction) && (
                                <Alert variant={message.type === "error" ? "destructive" : "default"} className="text-left">
                                    {message.type === "error" ? (
                                        <WarningCircleIcon />
                                    ) : message.type === "success" ? (
                                        <CheckCircleIcon />
                                    ) : message.type === "warning" ? (
                                        <WarningIcon />
                                    ) : (
                                        <InfoIcon />
                                    )}
                                    <AlertDescription
                                        dangerouslySetInnerHTML={{
                                            __html: kcSanitize(message.summary)
                                        }}
                                    />
                                </Alert>
                            )}
                            {children}
                            {auth?.showTryAnotherWayLink && (
                                <form
                                    autoComplete="off"
                                    id="kc-select-try-another-way-form"
                                    action={url.loginAction}
                                    method="post"
                                    className="flex justify-center"
                                >
                                    <input type="hidden" name="tryAnotherWay" value="on" />
                                    <Button variant="link" asChild>
                                        <a
                                            href="#"
                                            id="try-another-way"
                                            onClick={event => {
                                                document.forms["kc-select-try-another-way-form" as never].requestSubmit();
                                                event.preventDefault();
                                                return false;
                                            }}
                                        >
                                            {msg("doTryAnotherWay")}
                                        </a>
                                    </Button>
                                </form>
                            )}
                            {socialProvidersNode}
                        </div>
                    </div>
                </main>
                {displayInfo && (
                    <div id="kc-info" className="mt-auto pt-10 pb-1 text-center text-sm text-muted-foreground md:mt-7 md:pt-0 md:pb-0 md:text-base">
                        {infoNode}
                    </div>
                )}
            </div>
        </div>
    );
}

/** complete-registration: one subtitle per step; the OTP steps highlight where the code went. */
function registrationDescription(kcContext: Extract<KcContext, { pageId: "complete-registration.ftl" }>, msgStr: I18n["msgStr"]): ReactNode {
    const { step, phoneNumber, userEmail } = kcContext;
    const keys = {
        PHONE: "crDescPhone",
        PHONE_OTP: "crDescPhoneOtp",
        IDENTITY: "crDescIdentity",
        EMAIL: "crDescEmail",
        EMAIL_OTP: "crDescEmailOtp",
        PASSWORD: "crDescPassword"
    } as const;
    const target = step === "PHONE_OTP" ? (phoneNumber ? `+90 ${phoneNumber}` : "") : step === "EMAIL_OTP" ? userEmail : "";
    if (!target) return msgStr(keys[step]);
    const marker = "\u0000";
    const [before, after] = msgStr(keys[step], marker).split(marker);
    return (
        <>
            {before}
            <span className="text-foreground">{target}</span>
            {after}
        </>
    );
}

/** Puts each sentence of a two-sentence subtitle on its own line, as the designs break them. */
function sentenceLines(text: string): ReactNode {
    const sentences = text.split(/(?<=[.!?。])\s+/);
    return sentences.map((sentence, i) => (
        <span key={i}>
            {i > 0 && <br />}
            {sentence}
        </span>
    ));
}

/** info.ftl: the server's message (with any pending required actions in bold), else a generic line. */
function infoDescription(kcContext: Extract<KcContext, { pageId: "info.ftl" }>, i18n: I18n): ReactNode {
    const { message, requiredActions } = kcContext;
    let html = message?.summary?.trim() ?? "";
    if (requiredActions?.length) {
        html += ` <b>${requiredActions.map(action => i18n.advancedMsgStr(`requiredAction.${action}`)).join(", ")}</b>`;
    }
    if (!html) return i18n.msgStr("inDescription");
    return <span className="[&_b]:font-medium [&_b]:text-foreground" dangerouslySetInnerHTML={{ __html: kcSanitize(html) }} />;
}

/** A Turkish mobile number (the username of phone sign-in) as "+90 5XX XXX XX XX"; anything else unchanged. */
function formatAttemptedUsername(username: string | undefined) {
    const m = /^(5\d{2})(\d{3})(\d{2})(\d{2})$/.exec(username ?? "");
    return m ? `+90 ${m.slice(1).join(" ")}` : username;
}
