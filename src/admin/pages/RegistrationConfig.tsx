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
import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { Badge } from "@ui/components/badge";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
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
import { useRealm } from "../ui/realm";

const REGISTRATION_FLOW = "registration";
const COMPLETE_REGISTRATION = "complete-registration";

const STEP_META = {
    "register-or-resume": {
        label: "Kayıt: T.C. ile oluştur/devam et",
        desc: "Benzersiz T.C. Kimlik No ile kullanıcı oluşturur veya yarım kalan kaydı devam ettirir.",
        icon: <UserPlusIcon />
    },
    "registration-verification": {
        label: "OTP doğrulama bayrakları",
        desc: "E-posta (emailVerified) ve telefonu (phoneNumberVerified) OTP kodları doğru girilince işaretler.",
        icon: <ShieldCheckIcon />
    },
    "term-registration": {
        label: "Sözleşmeler (Terms & Conditions)",
        desc: "Kayıt formunda gösterilen, tek tek yapılandırılan sözleşme belgesi.",
        icon: <FileTextIcon />
    }
};
const STEP_ORDER = [
    "register-or-resume",
    "registration-verification",
    "term-registration"
];

const REQ_VARIANT = {
    REQUIRED: "default",
    ALTERNATIVE: "outline",
    CONDITIONAL: "outline",
    DISABLED: "secondary"
};
const REQ_LABEL = {
    REQUIRED: "Zorunlu",
    ALTERNATIVE: "Alternatif",
    CONDITIONAL: "Koşullu",
    DISABLED: "Devre dışı"
};

const VALIDATOR_META = {
    "tc-kimlik": {
        label: "T.C. Kimlik doğrulaması",
        desc: "Geçerli bir T.C. Kimlik No algoritması zorunlu kılınır.",
        icon: <IdentificationCardIcon />,
        tone: "blue"
    },
    "min-age": {
        label: "Asgari yaş",
        desc: "Doğum tarihinden hesaplanan yaşın asgari değerin altında olmaması sağlanır.",
        icon: <CalendarBlankIcon />,
        tone: "orange"
    }
};

export default function RegistrationConfig() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [loading, setLoading] = useState(true);
    const [steps, setSteps] = useState([]);
    const [requiredAction, setRequiredAction] = useState(null);
    const [validators, setValidators] = useState([]);
    const [policy, setPolicy] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [execs, actions, profile] = await Promise.all([
                adminClient.authenticationManagement
                    .getExecutions({ flow: REGISTRATION_FLOW })
                    .catch(() => []),
                adminClient.authenticationManagement.getRequiredActions().catch(() => []),
                adminClient.users.getProfile().catch(() => null)
            ]);

            // registration flow steps in defined order, in-flow order otherwise
            const wanted = (Array.isArray(execs) ? execs : []).filter(
                e => STEP_META[e.providerId]
            );
            wanted.sort((a, b) => {
                const ia = STEP_ORDER.indexOf(a.providerId);
                const ib = STEP_ORDER.indexOf(b.providerId);
                return ia - ib;
            });
            setSteps(wanted);

            const ra = (Array.isArray(actions) ? actions : []).find(
                a =>
                    a.alias === COMPLETE_REGISTRATION ||
                    a.providerId === COMPLETE_REGISTRATION
            );
            setRequiredAction(ra || null);

            // user-profile attributes carrying tc-kimlik / min-age validators
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
            setValidators(found);
            setPolicy(profile?.unmanagedAttributePolicy ?? null);
        } catch (err) {
            addError("Kayıt yapılandırması yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const toggleRequiredAction = next => {
        if (!requiredAction) return;
        const apply = async () => {
            setBusy(true);
            try {
                await adminClient.authenticationManagement.updateRequiredAction(
                    { alias: requiredAction.alias },
                    { ...requiredAction, enabled: next }
                );
                setRequiredAction({ ...requiredAction, enabled: next });
                addAlert(
                    next
                        ? "Required action etkinleştirildi."
                        : "Required action devre dışı bırakıldı.",
                    AlertVariant.success
                );
            } catch (err) {
                addError("Güncellenemedi.", err);
            } finally {
                setBusy(false);
            }
        };
        if (!next) {
            confirm({
                title: "Devre dışı bırak",
                message:
                    "“complete-registration” required action kapatılırsa yeni kullanıcılar kayıt sonrası doğrulama/şifre adımını atlayabilir.",
                confirmLabel: "Devre dışı bırak",
                danger: true,
                onConfirm: apply
            });
        } else {
            apply();
        }
    };

    if (loading)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            </div>
        );

    const emptyBlock = (icon, title, desc) => (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">{icon}</EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{desc}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-2xl space-y-8">
                {/* Registration flow steps */}
                <div>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        Kayıt akışı adımları
                    </h3>
                    {steps.length === 0 ? (
                        emptyBlock(
                            <UserPlusIcon />,
                            "Özel kayıt adımı yok",
                            "Kayıt akışında register-or-resume / registration-verification / term-registration yürütmeleri bulunamadı."
                        )
                    ) : (
                        <ItemGroup variant="inset">
                            {steps.map((s, idx) => {
                                const meta = STEP_META[s.providerId];
                                const req = s.requirement || "DISABLED";
                                return (
                                    <Fragment key={s.id}>
                                        {idx > 0 && <ItemSeparator />}
                                        <Item size="sm">
                                            <ItemMedia variant="icon">
                                                {meta.icon}
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle>
                                                    {meta.label}
                                                    <Badge
                                                        variant={
                                                            REQ_VARIANT[req] ||
                                                            "secondary"
                                                        }
                                                    >
                                                        {REQ_LABEL[req] || req}
                                                    </Badge>
                                                </ItemTitle>
                                                <ItemDescription>
                                                    {meta.desc}
                                                </ItemDescription>
                                                <ItemDescription className="font-mono text-xs">
                                                    {s.providerId}
                                                </ItemDescription>
                                            </ItemContent>
                                        </Item>
                                    </Fragment>
                                );
                            })}
                        </ItemGroup>
                    )}
                    <p className="mt-2 ms-1 text-sm text-muted-foreground">
                        Adım gereklilikleri Keycloak kimlik doğrulama akışından
                        (Registration) okunur. Sıralamayı ve gerekliliği akış ekranından
                        düzenleyin.
                    </p>
                </div>

                {/* complete-registration required action */}
                <div>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        Required action
                    </h3>
                    {requiredAction ? (
                        <>
                            <ItemGroup variant="inset">
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemTitle>
                                            {requiredAction.name ||
                                                "Complete Registration"}
                                        </ItemTitle>
                                        <ItemDescription>
                                            Yeni kullanıcılar için kayıt sonrası
                                            telefon/e-posta doğrulama + şifre adımını
                                            zorunlu kılar.
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <Switch
                                            checked={!!requiredAction.enabled}
                                            disabled={busy}
                                            onCheckedChange={toggleRequiredAction}
                                        />
                                    </ItemActions>
                                </Item>
                                <ItemSeparator />
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemTitle>Alias</ItemTitle>
                                    </ItemContent>
                                    <ItemActions>
                                        <span className="font-mono text-sm text-muted-foreground">
                                            {requiredAction.alias}
                                        </span>
                                    </ItemActions>
                                </Item>
                                <ItemSeparator />
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemTitle>Varsayılan aksiyon</ItemTitle>
                                        <ItemDescription>
                                            Tüm yeni kullanıcılara otomatik atanır.
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                            {requiredAction.defaultAction ? (
                                                <>
                                                    <CheckCircleIcon
                                                        className="size-4"
                                                        weight="fill"
                                                    />{" "}
                                                    Evet
                                                </>
                                            ) : (
                                                "Hayır"
                                            )}
                                        </span>
                                    </ItemActions>
                                </Item>
                            </ItemGroup>
                            <p className="mt-2 ms-1 text-sm text-muted-foreground">
                                Durum,{" "}
                                <span className="font-mono">
                                    authenticationManagement.updateRequiredAction
                                </span>{" "}
                                üzerinden değiştirilir.
                            </p>
                        </>
                    ) : (
                        emptyBlock(
                            <ShieldCheckIcon />,
                            "complete-registration bulunamadı",
                            "Bu realm'de “complete-registration” required action kayıtlı değil."
                        )
                    )}
                </div>

                {/* user-profile validators (read-mostly) */}
                <div>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        Kullanıcı profili doğrulayıcıları
                    </h3>
                    {validators.length === 0 ? (
                        emptyBlock(
                            <IdentificationCardIcon />,
                            "Özel doğrulayıcı yok",
                            "Hiçbir profil özniteliğinde tc-kimlik veya min-age doğrulayıcısı tanımlı değil."
                        )
                    ) : (
                        <ItemGroup variant="inset">
                            {validators.map((v, i) => {
                                const meta = VALIDATOR_META[v.validator];
                                const min =
                                    v.validator === "min-age"
                                        ? (v.config?.min ?? 18)
                                        : null;
                                return (
                                    <Fragment key={i}>
                                        {i > 0 && <ItemSeparator />}
                                        <Item size="sm">
                                            <ItemMedia variant="icon">
                                                {meta.icon}
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle>
                                                    {meta.label}
                                                    <Badge
                                                        variant="secondary"
                                                        className="font-mono"
                                                    >
                                                        {v.attribute}
                                                    </Badge>
                                                </ItemTitle>
                                                <ItemDescription>
                                                    {meta.desc}
                                                </ItemDescription>
                                                <ItemDescription className="font-mono text-xs">
                                                    {v.validator}
                                                    {min != null && ` · min=${min}`}
                                                </ItemDescription>
                                            </ItemContent>
                                        </Item>
                                    </Fragment>
                                );
                            })}
                        </ItemGroup>
                    )}
                    <p className="mt-2 ms-1 text-sm text-muted-foreground">
                        Doğrulayıcılar kullanıcı profili (User Profile) öznitelik
                        yapılandırmasından okunur. Değiştirmek için Realm ayarları →
                        Kullanıcı profili ekranını kullanın.
                    </p>
                </div>

                {/* informational: stored attributes */}
                <div>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        İlgili kullanıcı öznitelikleri
                    </h3>
                    <ItemGroup variant="inset">
                        <AttrInfo
                            icon={<IdentificationCardIcon />}
                            name="tc"
                            desc="T.C. Kimlik No (kullanıcı kimliği)."
                        />
                        <ItemSeparator />
                        <AttrInfo
                            icon={<PhoneIcon />}
                            name="phoneNumber"
                            desc="Telefon numarası."
                        />
                        <ItemSeparator />
                        <AttrInfo
                            icon={<CheckCircleIcon />}
                            name="phoneNumberVerified"
                            desc="Telefon OTP doğrulama bayrağı."
                        />
                    </ItemGroup>
                    <p className="mt-2 ms-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-start gap-1.5">
                            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                            Bu öznitelikler kayıt/doğrulama akışı tarafından otomatik
                            yönetilir; bilgilendirme amaçlıdır.
                            {policy && (
                                <>
                                    {" "}
                                    Yönetilmeyen öznitelik politikası:{" "}
                                    <span className="font-mono">{policy}</span>.
                                </>
                            )}
                        </span>
                    </p>
                </div>
            </div>
            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{confirmOpts?.title}</ConfirmTitle>
                        {confirmOpts?.message && (
                            <ConfirmDescription>{confirmOpts.message}</ConfirmDescription>
                        )}
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>Vazgeç</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? "Onayla"}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </div>
    );
}

function AttrInfo({ icon, name, desc }) {
    return (
        <Item size="sm">
            <ItemMedia variant="icon">{icon}</ItemMedia>
            <ItemContent>
                <ItemTitle className="font-mono">{name}</ItemTitle>
                <ItemDescription>{desc}</ItemDescription>
            </ItemContent>
        </Item>
    );
}
