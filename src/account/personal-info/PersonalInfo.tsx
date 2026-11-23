// @ts-nocheck

import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldError, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import type { TFunction } from "i18next";
import { get } from "lodash-es";
import { type ReactNode, useState } from "react";
import { type ErrorOption, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { SECURITY_IMAGES, securityImageSrc } from "../../shared/securityImages";
import {
    beerify,
    debeerify,
    fieldName,
    labelAttribute,
    setUserProfileServerError
} from "../../shared/keycloak-ui-shared/user-profile/utils";
import type { AccountEnvironment } from "..";
import { getPersonalInfo, getSupportedLocales, savePersonalInfo } from "../api/methods";
import type { UserProfileMetadata, UserRepresentation } from "../api/representations";
import { Page } from "../components/page/Page";
import { FormSkeleton } from "../root/Skeleton";
import type { TFuncKey } from "../i18n-type";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { usePromise } from "../utils/usePromise";

const SECURITY_IMAGE = "securityImage";

const HIDDEN = new Set(["locale", "username"]);

const firstValue = (value: unknown) =>
    (Array.isArray(value) ? value[0] : value) as string | undefined;

function localeName(code: string) {
    try {
        return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    } catch {
        return code;
    }
}

function toFormValues(user: UserRepresentation): UserRepresentation {
    return {
        ...user,
        attributes: Object.fromEntries(
            Object.entries(user.attributes || {}).map(([k, v]) => [beerify(k), v])
        )
    };
}

function inputTypeOf(attribute: any) {
    const type = attribute.annotations?.inputType as string | undefined;
    if (type?.startsWith("html5-")) return type.slice("html5-".length);
    return attribute.name === "email" ? "email" : "text";
}

function SecurityImageThumb({ value, className }: { value?: string; className?: string }) {
    const src = securityImageSrc(value);
    if (!src) return null;
    return (
        <img
            src={src}
            alt=""
            className={`object-cover dark:[filter:invert(1)_hue-rotate(180deg)_brightness(1.25)] ${className ?? ""}`}
        />
    );
}

function ActionRow({
    id,
    onClick,
    children
}: {
    id: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            id={id}
            data-testid={id}
            onClick={onClick}
            className="flex h-13.5 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 text-left text-[17px] outline-none transition-colors hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring dark:bg-foreground/6"
        >
            <span className="flex min-w-0 items-center truncate">{children}</span>
            <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        </button>
    );
}

export const PersonalInfo = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();
    const [userProfileMetadata, setUserProfileMetadata] = useState<UserProfileMetadata>();
    const [supportedLocales, setSupportedLocales] = useState<string[]>([]);
    const [pickingImage, setPickingImage] = useState(false);
    const form = useForm<UserRepresentation>({ mode: "onChange" });
    const { handleSubmit, reset, setValue, watch, register, formState } = form;
    const { addAlert } = useAccountAlerts();

    usePromise(
        signal =>
            Promise.all([
                getPersonalInfo({ signal, context }),
                getSupportedLocales({ signal, context })
            ]),
        ([personalInfo, locales]) => {
            setUserProfileMetadata(personalInfo.userProfileMetadata);
            setSupportedLocales(locales);
            reset(toFormValues(personalInfo));
        }
    );

    const onSubmit = async (user: UserRepresentation) => {
        try {
            const attributes = Object.fromEntries(
                Object.entries(user.attributes || {}).map(([k, v]) => [debeerify(k), v])
            );
            await savePersonalInfo(context, { ...user, attributes });
            const locale = firstValue(attributes.locale);
            if (locale) {
                window.dispatchEvent(
                    new CustomEvent("languageChanged", { detail: { language: locale } })
                );
            }
            await context.keycloak.updateToken();
            reset(user);
            addAlert(t("accountUpdatedMessage"));
        } catch (error) {
            addAlert(t("accountUpdatedError"), "danger");
            setUserProfileServerError(
                { responseData: { errors: error as any } },
                (name: string | number, err: unknown) =>
                    form.setError(name as string, err as ErrorOption),
                ((key: TFuncKey, param?: object) => t(key, param as any)) as TFunction
            );
        }
    };

    if (!userProfileMetadata) {
        return <FormSkeleton />;
    }

    const attributes = (userProfileMetadata.attributes ?? []).filter(
        a => !HIDDEN.has(a.name) && !a.name?.toLowerCase().includes("pet")
    );
    const imageAttribute = attributes.find(a => a.name === SECURITY_IMAGE);

    const {
        updateEmailFeatureEnabled,
        updateEmailActionEnabled,
        isRegistrationEmailAsUsername,
        isEditUserNameAllowed,
        deleteAccountAllowed
    } = context.environment.features;

    const emailAsAction = (attribute: any) =>
        attribute.name === "email" &&
        updateEmailFeatureEnabled &&
        updateEmailActionEnabled &&
        attribute.annotations?.["kc.required.action.supported"] &&
        (!isRegistrationEmailAsUsername || isEditUserNameAllowed);

    const renderControl = (attribute: any) => {
        const name = fieldName(attribute.name);
        const value = firstValue(watch(name));

        if (emailAsAction(attribute)) {
            return (
                <ActionRow
                    id={attribute.name}
                    onClick={() => context.keycloak.login({ action: "UPDATE_EMAIL" })}
                >
                    {value || "—"}
                </ActionRow>
            );
        }

        if (attribute.name === SECURITY_IMAGE && !attribute.readOnly) {
            return (
                <ActionRow id={attribute.name} onClick={() => setPickingImage(true)}>
                    {value ? (
                        <SecurityImageThumb value={value} className="size-8 rounded-lg" />
                    ) : (
                        "—"
                    )}
                </ActionRow>
            );
        }

        if (attribute.readOnly) {
            return (
                <Input
                    size="lg"
                    id={attribute.name}
                    data-testid={attribute.name}
                    readOnly
                    value={value || "—"}
                    className="text-muted-foreground"
                />
            );
        }

        const error = get(formState.errors, name) as { message?: string } | undefined;
        return (
            <>
                <Input
                    size="lg"
                    id={attribute.name}
                    data-testid={attribute.name}
                    type={inputTypeOf(attribute)}
                    aria-invalid={error !== undefined}
                    {...register(name)}
                />
                {error?.message && <FieldError>{error.message}</FieldError>}
            </>
        );
    };

    const imageOptions: string[] =
        imageAttribute?.validators?.options?.options ?? Object.keys(SECURITY_IMAGES);
    const currentImage = firstValue(watch(fieldName(SECURITY_IMAGE)));

    return (
        <Page title={t("personalInfo")} description={t("personalInfoDescription")}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="flex flex-col gap-4">
                    {attributes.map(attribute => (
                        <Field key={attribute.name} size="lg">
                            <FieldLabel htmlFor={attribute.name}>
                                {labelAttribute(t, attribute)}
                            </FieldLabel>
                            {renderControl(attribute)}
                        </Field>
                    ))}

                    {supportedLocales.length > 1 && (
                        <Field size="lg">
                            <FieldLabel htmlFor="locale">{t("selectALocale")}</FieldLabel>
                            <NativeSelect
                                id="locale"
                                size="lg"
                                className="w-full"
                                {...register("attributes.locale" as any)}
                            >
                                {supportedLocales.map(l => (
                                    <NativeSelectOption key={l} value={l}>
                                        {localeName(l)}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </Field>
                    )}
                </div>

                <div className="mt-7 flex flex-col gap-1.5">
                    <Button
                        type="submit"
                        data-testid="save"
                        size="form"
                        block
                        disabled={!formState.isDirty || formState.isSubmitting}
                    >
                        {t("save")}
                    </Button>
                    <Button
                        type="button"
                        data-testid="cancel"
                        variant="plain"
                        size="form"
                        block
                        disabled={!formState.isDirty || formState.isSubmitting}
                        onClick={() => reset()}
                    >
                        {t("cancel")}
                    </Button>
                </div>
            </form>

            {deleteAccountAllowed && (
                <section className="mt-7 border-t border-border pt-6">
                    <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                        {t("deleteAccountWarning")}
                    </p>
                    <Button
                        id="delete-account-btn"
                        size="form"
                        block
                        className="bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90"
                        onClick={() => context.keycloak.login({ action: "delete_account" })}
                    >
                        {t("deleteAccount")}
                    </Button>
                </section>
            )}

            {pickingImage && imageAttribute && (
                <Modal open onOpenChange={open => !open && setPickingImage(false)}>
                    <ModalContent>
                        <ModalHeader>
                            <ModalTitle>{labelAttribute(t, imageAttribute)}</ModalTitle>
                        </ModalHeader>
                        <ModalBody>
                            <div
                                role="radiogroup"
                                aria-label={labelAttribute(t, imageAttribute)}
                                className="mx-auto grid w-fit grid-cols-[repeat(3,92px)] gap-3"
                            >
                                {imageOptions.map((key, i) => (
                                    <label
                                        key={key}
                                        className="relative size-23 cursor-pointer rounded-[20px] has-checked:ring-2 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring/50"
                                    >
                                        <input
                                            type="radio"
                                            name="security-image-choice"
                                            value={key}
                                            checked={currentImage === key}
                                            onChange={() => {
                                                setValue(fieldName(SECURITY_IMAGE), [key], {
                                                    shouldDirty: true
                                                });
                                                setPickingImage(false);
                                            }}
                                            aria-label={`${i + 1}`}
                                            className="peer sr-only"
                                        />
                                        <SecurityImageThumb
                                            value={key}
                                            className="size-full rounded-[20px]"
                                        />
                                        <span
                                            aria-hidden="true"
                                            className="absolute -top-1.5 -right-1.5 hidden size-5.5 place-items-center rounded-full bg-primary text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] peer-checked:grid"
                                        >
                                            <CheckIcon weight="bold" className="size-3" />
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            )}
        </Page>
    );
};

export default PersonalInfo;
