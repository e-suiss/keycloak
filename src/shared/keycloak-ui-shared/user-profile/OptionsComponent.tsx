/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/user-profile/OptionsComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Checkbox } from "@ui/components/checkbox";
import { Label } from "@ui/components/label";
import { RadioGroup, RadioGroupItem } from "@ui/components/radio-group";
import { Controller } from "react-hook-form";
import type { OptionLabel, Options, UserProfileFieldProps } from "./UserProfileFields";
import { UserProfileGroup } from "./UserProfileGroup";
import { fieldName, isRequiredAttribute, label } from "./utils";

export const OptionComponent = (props: UserProfileFieldProps) => {
    const { form, inputType, attribute } = props;
    const isRequired = isRequiredAttribute(attribute);
    const isMultiSelect = inputType.startsWith("multiselect");
    const options = (attribute.validators?.options as Options | undefined)?.options || [];

    const optionLabel = (attribute.annotations?.inputOptionLabels as OptionLabel) || {};
    const prefix = attribute.annotations?.inputOptionLabelsI18nPrefix as string;

    return (
        <UserProfileGroup {...props}>
            <Controller
                name={fieldName(attribute.name)}
                control={form.control}
                defaultValue={attribute.defaultValue}
                render={({ field }) =>
                    isMultiSelect ? (
                        <div className="grid w-full gap-2">
                            {options.map(option => (
                                <div key={option} className="flex items-center gap-2">
                                    <Checkbox
                                        id={option}
                                        data-testid={option}
                                        value={option}
                                        checked={field.value?.includes(option)}
                                        onCheckedChange={() => {
                                            if (field.value?.includes(option)) {
                                                field.onChange(
                                                    field.value?.filter(
                                                        (item: string) => item !== option
                                                    )
                                                );
                                            } else {
                                                field.onChange([
                                                    ...(field.value || []),
                                                    option
                                                ]);
                                            }
                                        }}
                                        disabled={attribute.readOnly}
                                        required={isRequired}
                                    />
                                    <Label htmlFor={option}>
                                        {label(
                                            props.t,
                                            optionLabel[option],
                                            option,
                                            prefix
                                        )}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <RadioGroup
                            value={field.value?.[0]}
                            onValueChange={value => field.onChange([value])}
                            required={isRequired}
                            disabled={attribute.readOnly}
                        >
                            {options.map(option => (
                                <div key={option} className="flex items-center gap-2">
                                    <RadioGroupItem
                                        id={option}
                                        data-testid={option}
                                        value={option}
                                    />
                                    <Label htmlFor={option}>
                                        {label(
                                            props.t,
                                            optionLabel[option],
                                            option,
                                            prefix
                                        )}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )
                }
            />
        </UserProfileGroup>
    );
};
