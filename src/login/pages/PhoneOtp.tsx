import { Button } from "@ui/components/button";
import { FieldError } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useEffect, useRef, useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";
import { TIME_SLOT, TimeRemaining } from "../Countdown";

/**
 * Phone OTP step — React counterpart of "phone-otp.ftl" (Authenticators
 * "phone-otp" and "reset-phone-otp"). The server passes the already-masked
 * `phoneNumber`; this collects the 6-digit code and POSTs it back to
 * url.loginAction. The server generates a fresh code per challenge (3 minutes
 * valid, 3 wrong entries cancel it and send a new one); once the countdown runs
 * out, "resend" just POSTs the expired form so the server issues a new code.
 * Reuses the existing cr* OTP message keys.
 */
const OTP_SECONDS = 180;

export default function PhoneOtp(props: PageProps<Extract<KcContext, { pageId: "phone-otp.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { msgStr } = i18n;

    const { url, message } = kcContext;

    const formRef = useRef<HTMLFormElement>(null);
    const [remaining, setRemaining] = useState(OTP_SECONDS);

    useEffect(() => {
        if (remaining <= 0) return;
        const id = setInterval(() => setRemaining(r => (r <= 1 ? 0 : r - 1)), 1000);
        return () => clearInterval(id);
    }, [remaining]);

    const onlyDigits = (e: React.FormEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        const v = el.value.replace(/[^0-9]/g, "").slice(0, 6);
        if (v !== el.value) el.value = v;
        if (v.length === 6) formRef.current?.requestSubmit();
    };

    const hasError = message?.type === "error";

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={message !== undefined && !hasError}
            headerNode={msgStr("crTitlePhoneOtp")}
        >
            <form autoComplete="off" id="phone-otp-form" ref={formRef} className="-mt-1 flex flex-col" action={url.loginAction} method="post">
                <Input
                    size="lg"
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    placeholder="••••••"
                    aria-label={msgStr("crOtpLabelSms")}
                    aria-invalid={hasError}
                    className="text-center text-xl tracking-[0.4em] placeholder:text-foreground"
                    onInput={onlyDigits}
                />
                {hasError && (
                    <FieldError id="input-error-otp" aria-live="polite" className="mt-2 ps-0.5 text-left">
                        <span dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
                    </FieldError>
                )}

                <div className="mt-4.5 flex items-center justify-between gap-3 text-sm leading-tight">
                    <span className="text-[#86868b] tabular-nums">
                        {remaining > 0 ? (
                            <TimeRemaining template={msgStr("crTimeRemaining", TIME_SLOT)} seconds={remaining} />
                        ) : (
                            msgStr("crCodeExpired")
                        )}
                    </span>
                    {/* Only once the code has expired: posting the empty form then makes the server send a new one. */}
                    <button
                        type="button"
                        disabled={remaining > 0}
                        className="cursor-pointer font-medium text-primary hover:underline disabled:cursor-default disabled:opacity-40 disabled:hover:no-underline"
                        onClick={() => {
                            const otpInput = formRef.current?.elements.namedItem("otp");
                            if (otpInput instanceof HTMLInputElement) otpInput.value = "";
                            formRef.current?.requestSubmit();
                        }}
                    >
                        {msgStr("crResendCode")}
                    </button>
                </div>

                <Button type="submit" size="form" block className="mt-7">
                    {msgStr("crSubmitVerify")}
                </Button>
            </form>
        </Template>
    );
}
