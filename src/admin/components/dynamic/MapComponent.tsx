/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/MapComponent.tsx"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem } from "../../../shared/keycloak-ui-shared";
import type { KeyValueType } from "../key-value-form/key-value-convert";
import type { ComponentProps } from "./components";

export const MapComponent = ({
    name,
    label,
    helpText,
    required,
    isDisabled,
    defaultValue,
    options,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();

    const { watch, setValue } = useFormContext();
    const [map, setMap] = useState<KeyValueType[]>([]);
    const fieldName = convertToName(name!);
    const value = watch(fieldName, defaultValue || "[]");
    useEffect(() => {
        const values: KeyValueType[] = JSON.parse(value ? value : "[]");
        setMap(values);
    }, [value]);

    const appendNew = () => setMap([...map, { key: "", value: "" }]);

    const update = (val = map) => {
        const v = val.filter(e => e.key !== "");
        setValue(fieldName, v.length > 0 ? JSON.stringify(v) : "");
    };

    const updateKey = (index: number, key: string) => {
        return updateEntry(index, { ...map[index], key });
    };

    const updateValue = (index: number, value: string) => {
        return updateEntry(index, { ...map[index], value });
    };

    const updateEntry = (index: number, entry: KeyValueType) => {
        const newMap = [...map.slice(0, index), entry, ...map.slice(index + 1)];
        setMap(newMap);
        return newMap;
    };

    const remove = (index: number) => {
        const value = [...map.slice(0, index), ...map.slice(index + 1)];
        setMap(value);
        update(value);
    };

    return (
        <div className="space-y-1.5">
            <Label htmlFor={name!} className="flex items-center gap-1">
                {t(label!)}
                {required && <span className="text-destructive">*</span>}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </Label>
            {map.length !== 0 ? (
                <>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <strong>{t("key")}</strong>
                            </div>
                            <div className="flex-1">
                                <strong>{t("value")}</strong>
                            </div>
                        </div>
                        {map.map((attribute, index) => (
                            <div
                                key={index}
                                data-testid="row"
                                className="flex items-center gap-2"
                            >
                                <div className="flex-1">
                                    {options ? (
                                        <Select
                                            value={attribute.key || undefined}
                                            onValueChange={value => {
                                                update(updateKey(index, value));
                                            }}
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                data-testid={`${fieldName}.${index}.key`}
                                                aria-invalid={
                                                    attribute.key &&
                                                    !options.includes(attribute.key)
                                                        ? true
                                                        : undefined
                                                }
                                            >
                                                <SelectValue placeholder={t("choose")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.map((option, index) => (
                                                    <SelectItem
                                                        key={index}
                                                        value={option}
                                                    >
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            name={`${fieldName}.${index}.key`}
                                            placeholder={t("keyPlaceholder")}
                                            aria-label={t("key")}
                                            value={attribute.key}
                                            data-testid={`${fieldName}.${index}.key`}
                                            onChange={e =>
                                                updateKey(index, e.target.value)
                                            }
                                            onBlur={() => update()}
                                        />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input
                                        name={`${fieldName}.${index}.value`}
                                        placeholder={t("valuePlaceholder")}
                                        aria-label={t("value")}
                                        value={attribute.value}
                                        data-testid={`${fieldName}.${index}.value`}
                                        onChange={e => updateValue(index, e.target.value)}
                                        onBlur={() => update()}
                                    />
                                </div>
                                <div>
                                    <Button
                                        variant="link"
                                        size="icon"
                                        title={t("removeAttribute")}
                                        disabled={isDisabled}
                                        onClick={() => remove(index)}
                                        data-testid={`${fieldName}.${index}.remove`}
                                    >
                                        <MinusCircleIcon />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            data-testid={`${fieldName}-add-row`}
                            className="mt-2 px-0"
                            variant="link"
                            onClick={() => appendNew()}
                            disabled={isDisabled || map.some(e => e.key === "")}
                        >
                            <PlusCircleIcon />
                            {t("addAttribute", { label: t(label!) })}
                        </Button>
                    </div>
                </>
            ) : (
                <Empty data-testid={`${name}-empty-state`} className="border-0 p-0">
                    <EmptyDescription>
                        {t("missingAttributes", { label: t(label!) })}
                    </EmptyDescription>
                    <EmptyContent>
                        <Button
                            data-testid={`${name}-add-row`}
                            variant="link"
                            size="sm"
                            onClick={appendNew}
                            disabled={isDisabled}
                        >
                            <PlusCircleIcon />
                            {t("addAttribute", { label: t(label!) })}
                        </Button>
                    </EmptyContent>
                </Empty>
            )}
        </div>
    );
};
