// @ts-nocheck
import { Input } from "@ui/components/input";

import type { UserProfileFieldProps } from "./UserProfileFields";
import { UserProfileGroup } from "./UserProfileGroup";
import { fieldName, isRequiredAttribute, label } from "./utils";

export const TextComponent = (props: UserProfileFieldProps) => {
    const { form, inputType, attribute } = props;
    const isRequired = isRequiredAttribute(attribute);
    const type = inputType.startsWith("html")
        ? inputType.substring("html".length + 2)
        : "text";

    return (
        <UserProfileGroup {...props}>
            <Input
                id={attribute.name}
                data-testid={attribute.name}
                type={type}
                placeholder={
                    attribute.readOnly
                        ? ""
                        : label(
                              props.t,
                              attribute.annotations?.inputTypePlaceholder as string,
                              "",
                              attribute.annotations?.inputOptionLabelsI18nPrefix as string
                          )
                }
                disabled={attribute.readOnly}
                required={isRequired}
                defaultValue={attribute.defaultValue}
                {...form.register(fieldName(attribute.name))}
           />
        </UserProfileGroup>
    );
};
