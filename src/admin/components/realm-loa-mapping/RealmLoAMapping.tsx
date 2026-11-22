/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/realm-loa-mapping/RealmLoAMapping.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { MinusCircleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Empty, EmptyContent, EmptyDescription } from "@ui/components/empty";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Fragment, type PropsWithChildren } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

type RealmLoAMappingProps = PropsWithChildren & {
    name: string;
    label?: string;
    uri: boolean;
};

export type RealmLoAMappingType = { acr: string; uri?: string; loa: string };

export const RealmLoAMapping = ({
    name,
    label = "attributes",
    uri = false
}: RealmLoAMappingProps) => {
    const { t } = useTranslation();
    const {
        control,
        register,
        formState: { errors }
    } = useFormContext();

    const spanAcr = uri ? 4 : 5;
    const spanLoA = uri ? 2 : 5;

    const { fields, append, remove } = useFieldArray({
        control,
        name
    });

    const appendNew = () => append({ acr: "", uri: "", loa: "" });

    const getError = () => {
        return name.split(".").reduce((record: any, key) => record?.[key], errors);
    };

    const colClass = (span: number) =>
        ({
            2: "col-span-2",
            4: "col-span-4",
            5: "col-span-5"
        })[span] ?? "col-span-1";

    return fields.length > 0 ? (
        <>
            <div className="grid grid-cols-12 gap-4">
                <div className={colClass(spanAcr)}>
                    <Label className="text-muted-foreground text-sm">{t("acr")}</Label>
                </div>
                {uri && (
                    <div className={colClass(spanAcr)}>
                        <Label className="text-muted-foreground text-sm">
                            {t("uri")}
                        </Label>
                    </div>
                )}
                <div className={colClass(spanLoA)}>
                    <Label className="text-muted-foreground text-sm">{t("loa")}</Label>
                </div>
                {fields.map((attribute, index) => {
                    const error = getError()?.[index];
                    return (
                        <Fragment key={attribute.id}>
                            <div className={colClass(spanAcr)}>
                                <Input
                                    placeholder={t("acrPlaceholder")}
                                    aria-label={t("acr")}
                                    data-testid={`${name}-acr`}
                                    {...register(`${name}.${index}.acr`, {
                                        required: true
                                    })}
                                    aria-invalid={error?.acr ? true : undefined}
                                    required
                                />
                                {error?.acr && (
                                    <p className="text-destructive text-sm">
                                        {t("acrError")}
                                    </p>
                                )}
                            </div>
                            {uri && (
                                <div className={colClass(spanAcr)}>
                                    <Input
                                        placeholder={t("uriPlaceholder")}
                                        aria-label={t("uri")}
                                        data-testid={`${name}-uri`}
                                        {...register(`${name}.${index}.uri`, {
                                            // some validation for URI in JS????
                                        })}
                                        aria-invalid={error?.uri ? true : undefined}
                                    />
                                    {error?.uri && (
                                        <p className="text-destructive text-sm">
                                            {t("uriError")}
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className={colClass(spanLoA)}>
                                <Input
                                    placeholder={t("loaPlaceholder")}
                                    aria-label={t("loa")}
                                    data-testid={`${name}-loa`}
                                    {...register(`${name}.${index}.loa`, {
                                        required: true,
                                        validate: (v: string) =>
                                            Number.isInteger(parseInt(v, 10))
                                    })}
                                    aria-invalid={error?.loa ? true : undefined}
                                    required
                                />
                                {error?.loa && (
                                    <p className="text-destructive text-sm">
                                        {t("loaError")}
                                    </p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <Button
                                    variant="link"
                                    title={t("removeAttribute")}
                                    onClick={() => remove(index)}
                                    data-testid={`${name}-remove`}
                                >
                                    <MinusCircleIcon />
                                </Button>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <Button
                    data-testid={`${name}-add-row`}
                    className="mt-2 px-0"
                    variant="link"
                    onClick={appendNew}
                >
                    <PlusCircleIcon />
                    {t("addAttribute", { label })}
                </Button>
            </div>
        </>
    ) : (
        <Empty data-testid={`${name}-empty-state`} className="p-0">
            <EmptyDescription>{t("missingAttributes", { label })}</EmptyDescription>
            <EmptyContent>
                <Button
                    data-testid={`${name}-add-row`}
                    variant="link"
                    size="sm"
                    onClick={appendNew}
                >
                    <PlusCircleIcon />
                    {t("addAttribute", { label })}
                </Button>
            </EmptyContent>
        </Empty>
    );
};
