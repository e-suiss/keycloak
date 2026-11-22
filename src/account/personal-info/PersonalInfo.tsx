// @ts-nocheck

import { CaretRightIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Field, FieldError } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemGroup,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Spinner } from "@ui/components/spinner";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import type { TFunction } from "i18next";
import { get } from "lodash-es";
import { Fragment, type ReactNode, useState } from "react";
import { type ErrorOption, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import {
    beerify,
    debeerify,
    fieldName,
    isRequiredAttribute,
    labelAttribute,
    setUserProfileServerError
} from "../../shared/keycloak-ui-shared/user-profile/utils";
import type { AccountEnvironment } from "..";
import { getPersonalInfo, getSupportedLocales, savePersonalInfo } from "../api/methods";
import type { UserProfileMetadata, UserRepresentation } from "../api/representations";
import { Page } from "../components/page/Page";
import type { TFuncKey } from "../i18n-type";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { usePromise } from "../utils/usePromise";

function localeName(code: string) {
    try {
        return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    } catch {
        return code;
    }
}

const LOCALE = "__locale__";

function initialsOf(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase() || "?"
    );
}

export const PersonalInfo = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();
    const [userProfileMetadata, setUserProfileMetadata] = useState<UserProfileMetadata>();
    const [supportedLocales, setSupportedLocales] = useState<string[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [snapshot, setSnapshot] = useState("");
    const form = useForm<UserRepresentation>({ mode: "onChange" });
    const { handleSubmit, reset, setValue, getValues, watch, register, formState } = form;
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
            reset(personalInfo);
            Object.entries(personalInfo.attributes || {}).forEach(([k, v]) =>
                setValue(`attributes[${beerify(k)}]`, v)
            );
        }
    );

    const onSubmit = async (user: UserRepresentation) => {
        try {
            const attributes = Object.fromEntries(
                Object.entries(user.attributes || {}).map(([k, v]) => [debeerify(k), v])
            );
            await savePersonalInfo(context, { ...user, attributes });
            const locale = attributes.locale?.toString();
            if (locale) {
                window.dispatchEvent(
                    new CustomEvent("languageChanged", { detail: { language: locale } })
                );
            }
            await context.keycloak.updateToken();
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
        return (
            <div className="grid place-items-center py-24">
                <Spinner />
            </div>
        );
    }

    const attributes = userProfileMetadata.attributes ?? [];

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

    const idt = context.keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const heroName = idt?.name || idt?.email || "";
    const heroEmail = idt?.email || "";

    const openEdit = (attribute: any) => {
        setSnapshot(getValues(fieldName(attribute.name)) ?? "");
        setEditing(attribute);
    };
    const openLocale = () => {
        setSnapshot(getValues("attributes.locale") ?? context.environment.locale);
        setEditing(LOCALE);
    };
    const cancelEdit = () => {
        if (editing === LOCALE) {
            setValue("attributes.locale" as any, snapshot);
        } else if (editing) {
            setValue(fieldName(editing.name), snapshot);
        }
        setEditing(null);
    };
    const saveEdit = handleSubmit(async data => {
        await onSubmit(data);
        setEditing(null);
    });

    const editingAttr = editing && editing !== LOCALE ? editing : null;
    const editError = editingAttr
        ? (get(formState.errors, fieldName(editingAttr.name)) as
              | { message?: string }
              | undefined)
        : undefined;

    const rows: ReactNode[] = attributes
        .filter(
            a =>
                a.name !== "locale" &&
                a.name !== "username" &&
                !a.name?.toLowerCase().includes("pet")
        )
        .map(attribute => {
            const asAction = emailAsAction(attribute);
            const value = watch(fieldName(attribute.name));
            const onClick = asAction
                ? () => context.keycloak.login({ action: "UPDATE_EMAIL" })
                : attribute.readOnly
                  ? undefined
                  : () => openEdit(attribute);
            return (
                <FieldRow
                    key={attribute.name}
                    id={attribute.name}
                    label={
                        <>
                            {labelAttribute(t, attribute)}
                            {isRequiredAttribute(attribute) && (
                                <span className="text-destructive"> *</span>
                            )}
                        </>
                    }
                    value={value}
                    onClick={onClick}
                />
            );
        });

    if (supportedLocales.length > 1) {
        rows.push(
            <FieldRow
                key="locale"
                id="locale"
                label={t("selectALocale")}
                value={localeName(watch("attributes.locale") || context.environment.locale)}
                onClick={openLocale}
            />
        );
    }

    return (
        <Page title={t("personalInfo")} description={t("personalInfoDescription")}>
            {/* Profile hero */}
            <div className="mb-9 flex flex-col items-center gap-3.5 pt-1 text-center">
                <Avatar size="xl">
                    <AvatarFallback>{initialsOf(heroName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="truncate text-2xl font-semibold">{heroName}</p>
                    {heroEmail && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {heroEmail}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-7">
                <section>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {t("personalInfo")}
                    </h3>
                    <ItemGroup variant="inset">
                        {rows.map((row, index) => (
                            <Fragment key={(row as any)?.key ?? index}>
                                {index > 0 && <ItemSeparator />}
                                {row}
                            </Fragment>
                        ))}
                    </ItemGroup>
                </section>

                {deleteAccountAllowed && (
                    <section>
                        <Button
                            id="delete-account-btn"
                            variant="destructive"
                            size="lg"
                            block
                            onClick={() =>
                                context.keycloak.login({ action: "delete_account" })
                            }
                        >
                            {t("deleteAccount")}
                        </Button>
                        <p className="mt-2 ms-1 text-sm text-muted-foreground">
                            {t("deleteAccountWarning")}
                        </p>
                    </section>
                )}
            </div>

            {/* Tap-to-edit sheet */}
            {editing && (
                <Modal open onOpenChange={open => !open && cancelEdit()}>
                    <ModalContent>
                        <ModalHeader>
                            <ModalTitle>
                                {editing === LOCALE
                                    ? t("selectALocale")
                                    : labelAttribute(t, editing)}
                            </ModalTitle>
                        </ModalHeader>
                        <ModalBody>
                            {editing === LOCALE ? (
                                <NativeSelect
                                    id="locale"
                                    defaultValue={
                                        getValues("attributes.locale") ||
                                        context.environment.locale
                                    }
                                    className="w-full"
                                    {...register("attributes.locale" as any)}
                                >
                                    {supportedLocales.map(l => (
                                        <NativeSelectOption key={l} value={l}>
                                            {localeName(l)}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            ) : (
                                <Field data-invalid={editError !== undefined}>
                                    <Input
                                        id={editingAttr.name}
                                        data-testid={editingAttr.name}
                                        type={editingAttr.name === "email" ? "email" : "text"}
                                        aria-invalid={editError !== undefined}
                                        {...register(fieldName(editingAttr.name))}
                                    />
                                    {editError?.message && (
                                        <FieldError>{editError.message}</FieldError>
                                    )}
                                </Field>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                data-testid="save"
                                size="lg"
                                block
                                onClick={() => saveEdit()}
                            >
                                {t("save")}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}
        </Page>
    );
};

/** A read-only value row that opens an edit sheet on tap (appleid.apple.com style). */
function FieldRow({
    id,
    label,
    value,
    onClick
}: {
    id?: string;
    label: ReactNode;
    value?: ReactNode;
    onClick?: () => void;
}) {
    const tappable = !!onClick;
    const content = (
        <>
            <ItemContent>
                <ItemTitle className="font-normal">{label}</ItemTitle>
            </ItemContent>
            <ItemActions className="min-w-0">
                <span
                    className="min-w-0 truncate text-muted-foreground"
                    data-testid={id ? `${id}-value` : undefined}
                >
                    {value || "—"}
                </span>
                {tappable && <CaretRightIcon className="text-muted-foreground" />}
            </ItemActions>
        </>
    );
    if (tappable) {
        return (
            <Item size="sm" asChild>
                <button type="button" onClick={onClick}>
                    {content}
                </button>
            </Item>
        );
    }
    return <Item size="sm">{content}</Item>;
}

export default PersonalInfo;
