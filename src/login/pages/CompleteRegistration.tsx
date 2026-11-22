import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { Item, ItemActions, ItemContent, ItemGroup } from "@ui/components/item";
import { Switch } from "@ui/components/switch";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { Input } from "@ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@ui/components/input-group";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useEffect, useRef, useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext, Term } from "../KcContext";
import { TIME_SLOT, TimeRemaining } from "../Countdown";

const OTP_SECONDS = 180;

const TITLE_KEYS = {
    IDENTITY: "crTitleName",
    PHONE: "crTitlePhone",
    PHONE_OTP: "crTitlePhoneOtp",
    EMAIL: "crTitleEmail",
    EMAIL_OTP: "crTitleEmailOtp",
    PASSWORD: "crTitlePassword"
} as const;

export default function CompleteRegistration(props: PageProps<Extract<KcContext, { pageId: "complete-registration.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { msgStr } = i18n;

    const { url, step, firstName, lastName, tc, birthDate, phoneNumber, userEmail, message } = kcContext;
    const terms = kcContext.terms ?? [];
    const identity = step === "IDENTITY";

    const isOtp = step === "PHONE_OTP" || step === "EMAIL_OTP";

    const formRef = useRef<HTMLFormElement>(null);
    const [remaining, setRemaining] = useState(OTP_SECONDS);
    const [pinError, setPinError] = useState<string | null>(null);

    // Terms (IDENTITY): a title opens the document; a mustRead one can only be
    // switched on after it has been scrolled to the end and accepted.
    const [accepted, setAccepted] = useState<Record<string, boolean>>({});
    const [readTerms, setReadTerms] = useState<Record<string, boolean>>({});
    const [openTerm, setOpenTerm] = useState<string | null>(null);
    const shownTerm = terms.find(t => t.key === openTerm);
    const toggleTerm = (t: Term) => {
        if (t.mustRead && !readTerms[t.key] && !accepted[t.key]) {
            setOpenTerm(t.key);
            return;
        }
        setAccepted(a => ({ ...a, [t.key]: !a[t.key] }));
    };
    const markReadAtEnd = (t: Term) => (el: HTMLElement | null) => {
        if (!el || !t.mustRead || readTerms[t.key]) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setReadTerms(r => ({ ...r, [t.key]: true }));
    };

    // Bank-grade weak-PIN guard (mirrors the server CompleteRegistrationAction):
    // reject all-same, sequential, birth-date and id/phone-derived PINs.
    const isWeakPin = (pin: string): boolean => {
        if (new Set(pin).size === 1) return true;
        let asc = true;
        let desc = true;
        for (let i = 1; i < pin.length; i++) {
            const d = pin.charCodeAt(i) - pin.charCodeAt(i - 1);
            if (d !== 1) asc = false;
            if (d !== -1) desc = false;
        }
        if (asc || desc) return true;
        if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
            const yy = birthDate.slice(2, 4);
            const mo = birthDate.slice(5, 7);
            const da = birthDate.slice(8, 10);
            if ([da + mo + yy, yy + mo + da, mo + da + yy].includes(pin)) return true;
        }
        if (tc?.includes(pin)) return true;
        if (phoneNumber?.includes(pin)) return true;
        return false;
    };

    const formField = (name: string) => formRef.current?.elements.namedItem(name) as HTMLInputElement | null;

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        if (identity) {
            // One "Ad Soyad" field; the server keeps first and last name apart:
            // the last word is the surname, the rest is the given name.
            const parts = (formField("fullName")?.value ?? "").trim().split(/\s+/).filter(Boolean);
            const first = formField("firstName");
            const last = formField("lastName");
            if (first) first.value = parts.slice(0, -1).join(" ");
            if (last) last.value = parts.length > 1 ? parts[parts.length - 1] : "";
            // The field shows GG.AA.YYYY; the server expects yyyy-MM-dd.
            const birth = formRef.current?.querySelector<HTMLInputElement>('input[name="birthDate"]');
            if (birth) birth.value = displayToIsoDate(formRef.current?.querySelector<HTMLInputElement>("#birthDate")?.value ?? "");
            return;
        }
        if (step !== "PASSWORD") return;
        const pin = formField("password")?.value ?? "";
        // Only the weak-PIN rule is surfaced client-side; the server is authoritative
        // for the format (and re-checks weakness).
        if (/^[0-9]{6}$/.test(pin) && isWeakPin(pin)) {
            setPinError(msgStr("crPinWeak"));
            e.preventDefault();
            return;
        }
        setPinError(null);
    };

    useEffect(() => {
        if (!isOtp || remaining <= 0) return;
        const id = setInterval(() => setRemaining(r => (r <= 1 ? 0 : r - 1)), 1000);
        return () => clearInterval(id);
    }, [isOtp, remaining]);

    const onlyDigits = (max: number) => (e: React.FormEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        const v = el.value.replace(/[^0-9]/g, "").slice(0, max);
        if (v !== el.value) el.value = v;
        if (isOtp && v.length === 6) formRef.current?.requestSubmit();
    };

    const submitLabel = isOtp ? "crSubmitVerify" : step === "PASSWORD" ? "crSubmitCreate" : "crSubmitContinue";

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={message !== undefined}
            headerNode={msgStr(TITLE_KEYS[step] ?? "crTitleFallback")}
        >
            <form
                autoComplete="off"
                id="cr-form"
                ref={formRef}
                className="flex flex-col gap-4 text-left"
                action={url.loginAction}
                method="post"
                onSubmit={onSubmit}
            >
                {identity && (
                    <>
                        <Field size="lg">
                            <FieldLabel htmlFor="fullName">{msgStr("crLabelFullName")}</FieldLabel>
                            <Input
                                size="lg"
                                id="fullName"
                                type="text"
                                autoComplete="off"
                                autoCapitalize="words"
                                defaultValue={[firstName, lastName].filter(Boolean).join(" ")}
                            />
                            <input type="hidden" name="firstName" />
                            <input type="hidden" name="lastName" />
                        </Field>
                        <Field size="lg">
                            <FieldLabel htmlFor="birthDate">{msgStr("crLabelBirthDate")}</FieldLabel>
                            <Input
                                size="lg"
                                id="birthDate"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={10}
                                placeholder={msgStr("crBirthDatePlaceholder")}
                                defaultValue={isoToDisplayDate(birthDate)}
                                onInput={formatBirthDate}
                            />
                            <input type="hidden" name="birthDate" />
                        </Field>
                        <Field size="lg">
                            <FieldLabel htmlFor="tc">{msgStr("crLabelTc")}</FieldLabel>
                            <Input
                                size="lg"
                                id="tc"
                                name="tc"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={11}
                                defaultValue={tc ?? ""}
                                onInput={onlyDigits(11)}
                            />
                        </Field>
                    </>
                )}

                {identity && terms.length > 0 && (
                    <ItemGroup className="mt-1 gap-3">
                        {terms.map(t => (
                            <Item key={t.key} size="sm" className="p-0">
                                <ItemContent>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto justify-start whitespace-normal p-0 text-start text-sm"
                                        onClick={() => setOpenTerm(t.key)}
                                    >
                                        <span>
                                            {t.title}
                                            {t.required && <span className="text-destructive"> *</span>}
                                        </span>
                                    </Button>
                                </ItemContent>
                                <ItemActions>
                                    {accepted[t.key] && <input type="hidden" name={`term_${t.key}`} value={t.version || "1"} />}
                                    <Switch
                                        id={`term_${t.key}`}
                                        aria-label={t.title}
                                        checked={!!accepted[t.key]}
                                        onCheckedChange={() => toggleTerm(t)}
                                    />
                                </ItemActions>
                            </Item>
                        ))}
                    </ItemGroup>
                )}

                {step === "PHONE" && (
                    <Field size="lg">
                        <FieldLabel htmlFor="phoneNumber">{msgStr("crLabelPhone")}</FieldLabel>
                        <InputGroup size="lg">
                            <InputGroupAddon>
                                <InputGroupText className="text-foreground">+90</InputGroupText>
                                <span aria-hidden="true" className="ms-1 me-1.5 h-5.5 w-px bg-border" />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={10}
                                placeholder="5XX XXX XX XX"
                                onInput={onlyDigits(10)}
                            />
                        </InputGroup>
                    </Field>
                )}

                {step === "EMAIL" && (
                    <Field size="lg">
                        <FieldLabel htmlFor="email">{msgStr("crLabelEmail")}</FieldLabel>
                        <Input
                            size="lg"
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="off"
                            defaultValue={userEmail ?? ""}
                            placeholder="name@example.com"
                        />
                    </Field>
                )}

                {isOtp && (
                    <div className="flex flex-col gap-4">
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
                            aria-label={msgStr(step === "EMAIL_OTP" ? "crOtpLabelEmail" : "crOtpLabelSms")}
                            className="text-center text-xl tabular-nums tracking-[0.4em]"
                            onInput={onlyDigits(6)}
                        />
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground tabular-nums">
                                {remaining > 0 ? (
                                    <TimeRemaining template={msgStr("crTimeRemaining", TIME_SLOT)} seconds={remaining} />
                                ) : (
                                    msgStr("crCodeExpired")
                                )}
                            </span>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0"
                                disabled={remaining > 0}
                                onClick={() => setRemaining(OTP_SECONDS)}
                            >
                                {msgStr("crResendCode")}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "PASSWORD" && (
                    <>
                        <PinField id="password" label={msgStr("crLabelPassword")} autoFocus msgStr={msgStr} onInput={onlyDigits(6)} />
                        <PinField id="password-confirm" label={msgStr("crLabelPasswordConfirm")} msgStr={msgStr} onInput={onlyDigits(6)} />
                        {pinError && <FieldError>{pinError}</FieldError>}
                    </>
                )}

                <Button type="submit" size="form" block className="mt-3">
                    {msgStr(submitLabel)}
                </Button>

                {isOtp && (
                    <Button type="submit" variant="link" size="sm" name="back" value="1" formNoValidate className="self-center">
                        {msgStr(step === "EMAIL_OTP" ? "crChangeEmail" : "crChangePhone")}
                    </Button>
                )}
            </form>

            <Modal open={!!shownTerm} onOpenChange={o => !o && setOpenTerm(null)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{shownTerm?.title}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {shownTerm && (
                            <div
                                ref={markReadAtEnd(shownTerm)}
                                className="max-h-[55vh] overflow-y-auto text-sm leading-relaxed [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:font-semibold [&_p]:mb-2 [&_p]:text-muted-foreground"
                                onScroll={e => markReadAtEnd(shownTerm)(e.currentTarget)}
                                dangerouslySetInnerHTML={{ __html: shownTerm.content }}
                            />
                        )}
                    </ModalBody>
                    {shownTerm && (
                        <ModalFooter>
                            <Button
                                type="button"
                                size="form"
                                disabled={shownTerm.mustRead && !readTerms[shownTerm.key]}
                                onClick={() => {
                                    setAccepted(a => ({ ...a, [shownTerm.key]: true }));
                                    setReadTerms(r => ({ ...r, [shownTerm.key]: true }));
                                    setOpenTerm(null);
                                }}
                            >
                                {msgStr("doAccept")}
                            </Button>
                        </ModalFooter>
                    )}
                </ModalContent>
            </Modal>
        </Template>
    );
}

/** Formats typed digits as GG.AA.YYYY while the user types. */
function formatBirthDate(event: React.FormEvent<HTMLInputElement>) {
    const el = event.currentTarget;
    const digits = el.value.replace(/[^0-9]/g, "").slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    const formatted = parts.join(".");
    if (formatted !== el.value) el.value = formatted;
}

/** "1998-01-31" → "31.01.1998" */
function isoToDisplayDate(iso: string | undefined) {
    const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}

/** "31.01.1998" → "1998-01-31"; anything incomplete is sent as typed so the server reports it. */
function displayToIsoDate(display: string) {
    const match = display.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : display;
}

/** 6-digit PIN field with a reveal toggle (Şifre oluşturun). */
function PinField(props: {
    id: string;
    label: string;
    autoFocus?: boolean;
    msgStr: I18n["msgStr"];
    onInput: React.FormEventHandler<HTMLInputElement>;
}) {
    const { id, label, autoFocus, msgStr, onInput } = props;
    const [revealed, setRevealed] = useState(false);

    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputGroup size="lg">
                <InputGroupInput
                    id={id}
                    name={id}
                    type={revealed ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    maxLength={6}
                    className="group-data-[size=lg]/input-group:text-xl tracking-[0.35em]"
                    onInput={onInput}
                />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton
                        size="icon-sm"
                        className="text-muted-foreground"
                        aria-label={msgStr(revealed ? "hidePassword" : "showPassword")}
                        aria-controls={id}
                        onClick={() => setRevealed(r => !r)}
                    >
                        {revealed ? <EyeSlashIcon /> : <EyeIcon />}
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
}
