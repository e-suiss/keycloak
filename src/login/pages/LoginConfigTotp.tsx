import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginConfigTotp(props: PageProps<Extract<KcContext, { pageId: "login-config-totp.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, isAppInitiatedAction, totp, mode, messagesPerField } = kcContext;

    const { msg, msgStr, advancedMsgStr } = i18n;

    // "A, B veya C"
    const apps = totp.supportedApplications.map(app => advancedMsgStr(app));
    const appList = apps.length > 1 ? `${apps.slice(0, -1).join(", ")} ${msgStr("ctOr")} ${apps[apps.length - 1]}` : (apps[0] ?? "");

    const { policy } = totp;
    const isManual = mode === "manual";
    const policyRows: [string, string][] = [
        [msgStr("ctType"), msgStr(policy.type === "totp" ? "ctTimeBased" : "ctCounterBased")],
        [msgStr("ctAlgorithm"), policy.getAlgorithmKey()],
        [msgStr("ctDigits"), `${policy.digits}`],
        policy.type === "totp" ? [msgStr("ctPeriod"), msgStr("ctSeconds", `${policy.period}`)] : [msgStr("ctCounter"), `${policy.initialCounter}`]
    ];

    // The manual board is taller, so the design tightens the form there: 46px inputs, 6px label gap.
    const fieldClass = isManual ? "data-[size=lg]:gap-1.5" : undefined;
    const inputClass = isManual ? "data-[size=lg]:h-11.5 data-[size=lg]:text-base" : undefined;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            headerNode={msg("ctTitle")}
            displayMessage={!messagesPerField.existsError("totp", "userLabel")}
        >
            <div className="-mt-3.5 flex flex-col items-center">
                {isManual ? (
                    <>
                        <div className="w-full rounded-[14px] bg-[#f5f5f7] px-4 py-3.5 text-center dark:bg-white/8">
                            <span
                                id="kc-totp-secret-key"
                                className="mx-auto grid w-fit grid-cols-[repeat(4,auto)] gap-x-3.5 gap-y-2 text-base leading-[1.2] tracking-[0.08em] tabular-nums select-all"
                            >
                                {totp.totpSecretEncoded
                                    .split(" ")
                                    .filter(Boolean)
                                    .map((group, i) => (
                                        <span key={i}>{group}</span>
                                    ))}
                            </span>
                        </div>
                        <a id="mode-barcode" href={totp.qrUrl} className="mt-3 text-sm leading-tight text-[#86868b] hover:underline">
                            {msg("ctScanInstead")}
                        </a>
                        <dl className="mt-4 w-full overflow-hidden rounded-[14px] border border-[#e5e5ea] bg-white text-[13px] leading-[1.2] dark:border-white/14 dark:bg-white/5">
                            {policyRows.map(([label, value]) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between px-3.5 py-2.25 not-first:border-t not-first:border-[#e5e5ea] dark:not-first:border-white/12"
                                >
                                    <dt className="text-[#86868b]">{label}</dt>
                                    <dd className="font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-3.5 text-[13px] leading-[1.45] text-muted-foreground">{msg("ctManualHint", appList)}</p>
                    </>
                ) : (
                    <>
                        <div className="rounded-2xl border border-[#e5e5ea] bg-white p-3 dark:border-white/14">
                            <img id="kc-totp-secret-qr-code" className="size-32" src={`data:image/png;base64, ${totp.totpSecretQrCode}`} alt="QR" />
                        </div>
                        <a id="mode-manual" href={totp.manualUrl} className="mt-3.5 text-sm leading-tight text-[#86868b] hover:underline">
                            {msg("ctCantScan")}
                        </a>
                        <p className="mt-3.5 text-[13px] leading-[1.45] text-muted-foreground">{msg("ctScanHint", appList)}</p>
                    </>
                )}

                <form
                    autoComplete="off"
                    action={url.loginAction}
                    id="kc-totp-settings-form"
                    method="post"
                    className={`flex w-full flex-col text-left ${isManual ? "mt-5.5 gap-3.5" : "mt-6.5 gap-4"}`}
                >
                    <Field size="lg" className={fieldClass}>
                        <FieldLabel htmlFor="totp">{msg("ctCode")}</FieldLabel>
                        <Input
                            size="lg"
                            className={inputClass}
                            type="text"
                            id="totp"
                            name="totp"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={policy.digits}
                            aria-invalid={messagesPerField.existsError("totp")}
                        />
                        {messagesPerField.existsError("totp") && (
                            <FieldError id="input-error-otp-code" aria-live="polite">
                                <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("totp")) }} />
                            </FieldError>
                        )}
                    </Field>

                    <Field size="lg" className={fieldClass}>
                        <FieldLabel htmlFor="userLabel">{msg("ctDeviceName")}</FieldLabel>
                        <Input
                            size="lg"
                            className={inputClass}
                            type="text"
                            id="userLabel"
                            name="userLabel"
                            autoComplete="off"
                            aria-invalid={messagesPerField.existsError("userLabel")}
                        />
                        {messagesPerField.existsError("userLabel") && (
                            <FieldError id="input-error-otp-label" aria-live="polite">
                                <span dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("userLabel")) }} />
                            </FieldError>
                        )}
                    </Field>

                    <input type="hidden" id="totpSecret" name="totpSecret" value={totp.totpSecret} />
                    {mode && <input type="hidden" id="mode" name="mode" value={mode} />}
                    {/* Keycloak's default: setting up a new authenticator signs out the other sessions. */}
                    <input type="hidden" name="logout-sessions" value="on" />

                    <div className={`flex flex-col gap-1.5 ${isManual ? "mt-1.5" : "mt-2"}`}>
                        <Button type="submit" size="form" block id="saveTOTPBtn" value={msgStr("doSubmit")}>
                            {msgStr("ctSubmit")}
                        </Button>
                        {isAppInitiatedAction && (
                            <Button type="submit" variant="plain" size="form" block id="cancelTOTPBtn" name="cancel-aia" value="true">
                                {msgStr("ctCancel")}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Template>
    );
}
