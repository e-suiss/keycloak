// @ts-nocheck

import {
    CalendarBlankIcon,
    CheckCircleIcon,
    FileTextIcon,
    IdentificationCardIcon,
    InfoIcon,
    PhoneIcon,
    ShieldCheckIcon,
    UserPlusIcon
} from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import { Switch } from "@ui/components/switch";
import {
    Confirm,
    ConfirmAction,
    ConfirmCancel,
    ConfirmContent,
    ConfirmDescription,
    ConfirmFooter,
    ConfirmHeader,
    ConfirmTitle
} from "@ui/patterns/confirm";
import { AdminPage, Chip, Group, ListSkeleton, Notice, Row, Section } from "../ui/kit";
import { useRealm } from "../ui/realm";
import { registrationFlowAlias } from "../ui/util";

const COMPLETE_REGISTRATION = "complete-registration";

const STEP_META = {
    "register-or-resume": {
        label: "sxRegConfigStepRegisterOrResume",
        desc: "sxRegConfigStepRegisterOrResumeDesc",
        icon: <UserPlusIcon />
    },
    "registration-verification": {
        label: "sxRegConfigStepVerification",
        desc: "sxRegConfigStepVerificationDesc",
        icon: <ShieldCheckIcon />
    },
    "term-registration": {
        label: "sxRegConfigStepTerms",
        desc: "sxRegConfigStepTermsDesc",
        icon: <FileTextIcon />
    }
};
const STEP_ORDER = ["register-or-resume", "registration-verification", "term-registration"];

const REQ_TONE = {
    REQUIRED: "success",
    ALTERNATIVE: "info",
    CONDITIONAL: "info",
    DISABLED: "neutral"
};
const REQ_LABEL = {
    REQUIRED: "sxRegConfigReqRequired",
    ALTERNATIVE: "sxRegConfigReqAlternative",
    CONDITIONAL: "sxRegConfigReqConditional",
    DISABLED: "sxCommonDisabled"
};

const VALIDATOR_META = {
    "tc-kimlik": {
        label: "sxRegConfigValidatorTc",
        desc: "sxRegConfigValidatorTcDesc",
        icon: <IdentificationCardIcon />
    },
    "min-age": {
        label: "sxRegConfigValidatorMinAge",
        desc: "sxRegConfigValidatorMinAgeDesc",
        icon: <CalendarBlankIcon />
    }
};

function Icon({ children }: { children: ReactNode }) {
    return <span className="text-muted-foreground [&_svg]:size-5.5">{children}</span>;
}

function Footnote({ children }: { children: ReactNode }) {
    return <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}

function Lines({ children, mono }: { children: ReactNode; mono?: ReactNode }) {
    return (
        <>
            <span className="block">{children}</span>
            {mono && <span className="mt-0.5 block font-mono text-xs">{mono}</span>}
        </>
    );
}

function withToken(text: string, token: string, node: ReactNode) {
    const [before, after = ""] = text.split(token);
    return (
        <>
            {before}
            {node}
            {after}
        </>
    );
}

const TOKEN = "%VALUE%";

function useLoad(fetcher: () => Promise<any>, deps: any[]) {
    const [state, setState] = useState<{ status: "loading" | "error" | "ready"; data: any }>({
        status: "loading",
        data: null
    });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState({ status: "loading", data: null });
        fetcher()
            .then(data => alive && setState({ status: "ready", data }))
            .catch(() => alive && setState({ status: "error", data: null }));
        return () => {
            alive = false;
        };
    }, [...deps, attempt]);
    const setData = (data: any) => setState(s => ({ ...s, data }));
    const reload = () => setAttempt(n => n + 1);
    return { status: state.status, data: state.data, setData, reload };
}

function LoadState({ res, errorTitle, rows = 3 }: { res: any; errorTitle: string; rows?: number }) {
    const t = useT();
    if (res.status === "loading") return <ListSkeleton rows={rows} />;
    return <Notice title={errorTitle} description={t("sxLoadErrorDescription")} onRetry={res.reload} />;
}

export default function RegistrationConfig() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [busy, setBusy] = useState(false);

    const stepsRes = useLoad(async () => {
        const flow = await registrationFlowAlias(adminClient, realm);
        const execs = await adminClient.authenticationManagement.getExecutions({ flow });
        const wanted = (Array.isArray(execs) ? execs : []).filter(e => STEP_META[e.providerId]);
        wanted.sort((a, b) => STEP_ORDER.indexOf(a.providerId) - STEP_ORDER.indexOf(b.providerId));
        return wanted;
    }, [adminClient, realm]);

    const actionRes = useLoad(async () => {
        const actions = await adminClient.authenticationManagement.getRequiredActions();
        const ra = (Array.isArray(actions) ? actions : []).find(
            a => a.alias === COMPLETE_REGISTRATION || a.providerId === COMPLETE_REGISTRATION
        );
        return ra || null;
    }, [adminClient, realm]);

    const profileRes = useLoad(async () => {
        const profile = await adminClient.users.getProfile();
        const attrs = profile?.attributes || [];
        const found = [];
        attrs.forEach(a => {
            const v = a.validations || a.validators || {};
            Object.keys(v).forEach(id => {
                if (VALIDATOR_META[id]) {
                    found.push({
                        attribute: a.name,
                        validator: id,
                        config: v[id] || {}
                    });
                }
            });
        });
        return { validators: found, policy: profile?.unmanagedAttributePolicy ?? null };
    }, [adminClient, realm]);

    const steps = stepsRes.data || [];
    const requiredAction = actionRes.data;
    const validators = profileRes.data?.validators || [];
    const policy = profileRes.data?.policy ?? null;

    const toggleRequiredAction = next => {
        if (!requiredAction) return;
        const apply = async () => {
            setBusy(true);
            try {
                await adminClient.authenticationManagement.updateRequiredAction(
                    { alias: requiredAction.alias },
                    { ...requiredAction, enabled: next }
                );
                actionRes.setData({ ...requiredAction, enabled: next });
                addAlert(
                    next ? t("sxRegConfigRequiredActionEnabled") : t("sxRegConfigRequiredActionDisabled"),
                    AlertVariant.success
                );
            } catch (err) {
                addError(t("sxCommonUpdateError"), err);
            } finally {
                setBusy(false);
            }
        };
        if (!next) {
            confirm({
                title: t("sxRegConfigDisable"),
                message: t("sxRegConfigDisableConfirm"),
                confirmLabel: t("sxRegConfigDisable"),
                danger: true,
                onConfirm: apply
            });
        } else {
            apply();
        }
    };

    return (
        <AdminPage title={t("sxRegConfigTitle")} description={t("sxRegConfigDescription")}>
            <Section label={t("sxRegConfigStepsSection")}>
                {stepsRes.status !== "ready" ? (
                    <LoadState res={stepsRes} errorTitle={t("sxRegConfigStepsLoadError")} />
                ) : steps.length === 0 ? (
                    <Notice title={t("sxRegConfigNoSteps")} description={t("sxRegConfigNoStepsDescription")} />
                ) : (
                    <Group>
                        {steps.map(s => {
                            const meta = STEP_META[s.providerId];
                            const req = s.requirement || "DISABLED";
                            return (
                                <Row
                                    key={s.id}
                                    leading={<Icon>{meta.icon}</Icon>}
                                    title={t(meta.label)}
                                    subtitle={<Lines mono={s.providerId}>{t(meta.desc)}</Lines>}
                                    trailing={
                                        <Chip tone={REQ_TONE[req] || "neutral"}>
                                            {REQ_LABEL[req] ? t(REQ_LABEL[req]) : req}
                                        </Chip>
                                    }
                                />
                            );
                        })}
                    </Group>
                )}
                <Footnote>{t("sxRegConfigStepsFootnote")}</Footnote>
            </Section>

            <Section label={t("sxRegConfigRequiredActionSection")}>
                {actionRes.status !== "ready" ? (
                    <LoadState res={actionRes} errorTitle={t("sxRegConfigRequiredActionLoadError")} rows={3} />
                ) : requiredAction ? (
                    <>
                        <Group>
                            <Row
                                key="toggle"
                                title={requiredAction.name || "Complete Registration"}
                                subtitle={t("sxRegConfigRequiredActionHint")}
                                trailing={
                                    <Switch
                                        aria-label={requiredAction.name || "Complete Registration"}
                                        checked={!!requiredAction.enabled}
                                        disabled={busy}
                                        onCheckedChange={toggleRequiredAction}
                                    />
                                }
                            />
                            <Row
                                key="alias"
                                className="min-h-13"
                                title={t("sxRegConfigAlias")}
                                trailing={
                                    <span className="font-mono text-[13px] text-muted-foreground">
                                        {requiredAction.alias}
                                    </span>
                                }
                            />
                            <Row
                                key="default"
                                title={t("sxRegConfigDefaultAction")}
                                subtitle={t("sxRegConfigDefaultActionHint")}
                                trailing={
                                    requiredAction.defaultAction ? (
                                        <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#248a3d] dark:text-[#32d74b]">
                                            <CheckCircleIcon className="size-4" weight="fill" />
                                            {t("sxCommonYes")}
                                        </span>
                                    ) : (
                                        <span className="text-[15px] text-muted-foreground">{t("sxCommonNo")}</span>
                                    )
                                }
                            />
                        </Group>
                        <Footnote>
                            {withToken(
                                t("sxRegConfigRequiredActionFootnote", { method: TOKEN }),
                                TOKEN,
                                <span className="font-mono">authenticationManagement.updateRequiredAction</span>
                            )}
                        </Footnote>
                    </>
                ) : (
                    <Notice
                        title={t("sxRegConfigRequiredActionMissing")}
                        description={t("sxRegConfigRequiredActionMissingDescription")}
                    />
                )}
            </Section>

            <Section label={t("sxRegConfigValidatorsSection")}>
                {profileRes.status !== "ready" ? (
                    <LoadState res={profileRes} errorTitle={t("sxRegConfigValidatorsLoadError")} rows={2} />
                ) : validators.length === 0 ? (
                    <Notice title={t("sxRegConfigNoValidators")} description={t("sxRegConfigNoValidatorsDescription")} />
                ) : (
                    <Group>
                        {validators.map((v, i) => {
                            const meta = VALIDATOR_META[v.validator];
                            const min = v.validator === "min-age" ? (v.config?.min ?? 18) : null;
                            return (
                                <Row
                                    key={i}
                                    leading={<Icon>{meta.icon}</Icon>}
                                    title={t(meta.label)}
                                    subtitle={
                                        <Lines
                                            mono={
                                                <>
                                                    {v.validator}
                                                    {min != null && ` · min=${min}`}
                                                </>
                                            }
                                        >
                                            {t(meta.desc)}
                                        </Lines>
                                    }
                                    trailing={
                                        <span className="font-mono">
                                            <Chip>{v.attribute}</Chip>
                                        </span>
                                    }
                                />
                            );
                        })}
                    </Group>
                )}
                <Footnote>{t("sxRegConfigValidatorsFootnote")}</Footnote>
            </Section>

            <Section label={t("sxRegConfigAttributesSection")}>
                <Group>
                    <Row
                        key="tc"
                        leading={
                            <Icon>
                                <IdentificationCardIcon />
                            </Icon>
                        }
                        title={<span className="font-mono">tc</span>}
                        subtitle={t("sxRegConfigAttrTc")}
                    />
                    <Row
                        key="phoneNumber"
                        leading={
                            <Icon>
                                <PhoneIcon />
                            </Icon>
                        }
                        title={<span className="font-mono">phoneNumber</span>}
                        subtitle={t("sxRegConfigAttrPhone")}
                    />
                    <Row
                        key="phoneNumberVerified"
                        leading={
                            <Icon>
                                <CheckCircleIcon />
                            </Icon>
                        }
                        title={<span className="font-mono">phoneNumberVerified</span>}
                        subtitle={t("sxRegConfigAttrPhoneVerified")}
                    />
                </Group>
                <Footnote>
                    <span className="inline-flex items-start gap-1.5">
                        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            {t("sxRegConfigAttributesFootnote")}
                            {policy && (
                                <>
                                    {" "}
                                    {withToken(
                                        t("sxRegConfigUnmanagedPolicy", { policy: TOKEN }),
                                        TOKEN,
                                        <span className="font-mono">{policy}</span>
                                    )}
                                </>
                            )}
                        </span>
                    </span>
                </Footnote>
            </Section>

            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{confirmOpts?.title}</ConfirmTitle>
                        {confirmOpts?.message && <ConfirmDescription>{confirmOpts.message}</ConfirmDescription>}
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? t("sxCommonConfirm")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </AdminPage>
    );
}
