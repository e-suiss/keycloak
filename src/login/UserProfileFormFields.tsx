import { RadioGroup, RadioGroupItem } from "@ui/components/radio-group";
import { Label } from "@ui/components/label";
import { Checkbox } from "@ui/components/checkbox";
import { Button } from "@ui/components/button";
import { PasswordWrapper } from "./PasswordWrapper";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui/components/field";
import { InputGroupInput } from "@ui/components/input-group";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Textarea } from "@ui/components/textarea";
import { Input } from "@ui/components/input";
import type { Attribute } from "keycloakify/login/KcContext";
import {
    type FormAction,
    type FormFieldError,
    getButtonToDisplayForMultivaluedAttributeField,
    useUserProfileForm
} from "keycloakify/login/lib/useUserProfileForm";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import { assert } from "keycloakify/tools/assert";
import { Fragment, useEffect } from "react";
import type { I18n } from "./i18n";
import type { KcContext } from "./KcContext";

export default function UserProfileFormFields(props: Omit<UserProfileFormFieldsProps<KcContext, I18n>, "kcClsx">) {
    const { kcContext, i18n, onIsFormSubmittableValueChange, doMakeUserConfirmPassword } = props;

    const { advancedMsg } = i18n;

    const {
        formState: { formFieldStates, isFormSubmittable },
        dispatchFormAction
    } = useUserProfileForm({
        kcContext,
        i18n,
        doMakeUserConfirmPassword
    });

    useEffect(() => {
        onIsFormSubmittableValueChange(isFormSubmittable);
    }, [isFormSubmittable, onIsFormSubmittableValueChange]);

    const groupNameRef = { current: "" };

    return (
        <>
            {formFieldStates.map(({ attribute, displayableErrors, valueOrValues }) => {
                return (
                    <Fragment key={attribute.name}>
                        <GroupLabel attribute={attribute} groupNameRef={groupNameRef} i18n={i18n} />
                        <Field
                            size="lg"
                            style={{
                                display:
                                    attribute.annotations.inputType === "hidden" ||
                                    (attribute.name === "password-confirm" && !doMakeUserConfirmPassword)
                                        ? "none"
                                        : undefined
                            }}
                        >
                            <FieldLabel htmlFor={attribute.name}>{advancedMsg(attribute.displayName ?? "")}</FieldLabel>
                            {attribute.annotations.inputHelperTextBefore !== undefined && (
                                <FieldDescription id={`form-help-text-before-${attribute.name}`} aria-live="polite">
                                    {advancedMsg(attribute.annotations.inputHelperTextBefore)}
                                </FieldDescription>
                            )}
                            <InputFieldByType
                                attribute={attribute}
                                valueOrValues={valueOrValues}
                                displayableErrors={displayableErrors}
                                dispatchFormAction={dispatchFormAction}
                                i18n={i18n}
                            />
                            <FieldErrors attribute={attribute} displayableErrors={displayableErrors} fieldIndex={undefined} />
                            {attribute.annotations.inputHelperTextAfter !== undefined && (
                                <FieldDescription id={`form-help-text-after-${attribute.name}`} aria-live="polite">
                                    {advancedMsg(attribute.annotations.inputHelperTextAfter)}
                                </FieldDescription>
                            )}
                            {/* NOTE: Downloading of html5DataAnnotations scripts is done in the useUserProfileForm hook */}
                        </Field>
                    </Fragment>
                );
            })}
        </>
    );
}

function GroupLabel(props: {
    attribute: Attribute;
    groupNameRef: {
        current: string;
    };
    i18n: I18n;
}) {
    const { attribute, groupNameRef, i18n } = props;

    const { advancedMsg } = i18n;

    if (attribute.group?.name !== groupNameRef.current) {
        groupNameRef.current = attribute.group?.name ?? "";

        if (groupNameRef.current !== "") {
            assert(attribute.group !== undefined);

            return (
                <div
                    className="group relative flex flex-col text-left"
                    {...Object.fromEntries(Object.entries(attribute.group.html5DataAnnotations).map(([key, value]) => [`data-${key}`, value]))}
                >
                    {(() => {
                        const groupDisplayHeader = attribute.group.displayHeader ?? "";
                        const groupHeaderText = groupDisplayHeader !== "" ? advancedMsg(groupDisplayHeader) : attribute.group.name;

                        return (
                            <div className="flex flex-col gap-5">
                                <Label id={`header-${attribute.group.name}`} className="px-1 font-medium text-sm text-muted-foreground">
                                    {groupHeaderText}
                                </Label>
                            </div>
                        );
                    })()}
                    {(() => {
                        const groupDisplayDescription = attribute.group.displayDescription ?? "";

                        if (groupDisplayDescription !== "") {
                            const groupDescriptionText = advancedMsg(groupDisplayDescription);

                            return (
                                <div>
                                    <Label id={`description-${attribute.group.name}`} className="px-1 font-normal text-sm text-muted-foreground">
                                        {groupDescriptionText}
                                    </Label>
                                </div>
                            );
                        }

                        return null;
                    })()}
                </div>
            );
        }
    }

    return null;
}

function FieldErrors(props: { attribute: Attribute; displayableErrors: FormFieldError[]; fieldIndex: number | undefined }) {
    const { attribute, fieldIndex } = props;

    const displayableErrors = props.displayableErrors.filter(error => error.fieldIndex === fieldIndex);

    if (displayableErrors.length === 0) {
        return null;
    }

    return (
        <FieldError id={`input-error-${attribute.name}${fieldIndex === undefined ? "" : `-${fieldIndex}`}`} aria-live="polite">
            {displayableErrors
                .filter(error => error.fieldIndex === fieldIndex)
                .map(({ errorMessage }, i, arr) => (
                    <Fragment key={i}>
                        {errorMessage}
                        {arr.length - 1 !== i && <br />}
                    </Fragment>
                ))}
        </FieldError>
    );
}

type InputFieldByTypeProps = {
    attribute: Attribute;
    valueOrValues: string | string[];
    displayableErrors: FormFieldError[];
    dispatchFormAction: React.Dispatch<FormAction>;
    i18n: I18n;
};

function InputFieldByType(props: InputFieldByTypeProps) {
    const { attribute, valueOrValues } = props;

    switch (attribute.annotations.inputType) {
        // NOTE: Unfortunately, keycloak won't let you define input type="hidden" in the Admin Console.
        // sometimes in the future it might.
        case "hidden":
            return <input type="hidden" name={attribute.name} value={valueOrValues} />;
        case "textarea":
            return <TextareaTag {...props} />;
        case "select":
        case "multiselect":
            return <SelectTag {...props} />;
        case "select-radiobuttons":
        case "multiselect-checkboxes":
            return <InputTagSelects {...props} />;
        default: {
            if (Array.isArray(valueOrValues)) {
                return (
                    <>
                        {valueOrValues.map((...[, i]) => (
                            <InputTag key={i} {...props} fieldIndex={i} />
                        ))}
                    </>
                );
            }

            const inputNode = <InputTag {...props} fieldIndex={undefined} />;

            if (attribute.name === "password" || attribute.name === "password-confirm") {
                return (
                    <PasswordWrapper i18n={props.i18n} passwordInputId={attribute.name}>
                        {inputNode}
                    </PasswordWrapper>
                );
            }

            return inputNode;
        }
    }
}
function InputTag(props: InputFieldByTypeProps & { fieldIndex: number | undefined }) {
    const { attribute, fieldIndex, dispatchFormAction, valueOrValues, i18n, displayableErrors } = props;

    const { advancedMsgStr } = i18n;

    // Inside PasswordWrapper the input sits in an esuiss InputGroup.
    const inGroup = attribute.name === "password" || attribute.name === "password-confirm";
    const Control = inGroup ? InputGroupInput : Input;
    // A plain Input takes the large size itself; inside PasswordWrapper the InputGroup carries it.
    const sizeProps = inGroup ? {} : { size: "lg" as const };

    return (
        <>
            <Control
                {...sizeProps}
                type={(() => {
                    const { inputType } = attribute.annotations;

                    if (inputType?.startsWith("html5-")) {
                        return inputType.slice(6);
                    }

                    return inputType ?? "text";
                })()}
                id={attribute.name}
                name={attribute.name}
                value={(() => {
                    if (fieldIndex !== undefined) {
                        assert(Array.isArray(valueOrValues));
                        return valueOrValues[fieldIndex];
                    }

                    assert(typeof valueOrValues === "string");

                    return valueOrValues;
                })()}
                aria-invalid={displayableErrors.find(error => error.fieldIndex === fieldIndex) !== undefined}
                disabled={attribute.readOnly}
                autoComplete="off"
                placeholder={
                    attribute.annotations.inputTypePlaceholder === undefined ? undefined : advancedMsgStr(attribute.annotations.inputTypePlaceholder)
                }
                pattern={attribute.annotations.inputTypePattern}
                maxLength={
                    attribute.annotations.inputTypeMaxlength === undefined ? undefined : parseInt(`${attribute.annotations.inputTypeMaxlength}`, 10)
                }
                minLength={
                    attribute.annotations.inputTypeMinlength === undefined ? undefined : parseInt(`${attribute.annotations.inputTypeMinlength}`, 10)
                }
                max={attribute.annotations.inputTypeMax}
                min={attribute.annotations.inputTypeMin}
                step={attribute.annotations.inputTypeStep}
                {...Object.fromEntries(Object.entries(attribute.html5DataAnnotations ?? {}).map(([key, value]) => [`data-${key}`, value]))}
                onChange={event =>
                    dispatchFormAction({
                        action: "update",
                        name: attribute.name,
                        valueOrValues: (() => {
                            if (fieldIndex !== undefined) {
                                assert(Array.isArray(valueOrValues));

                                return valueOrValues.map((value, i) => {
                                    if (i === fieldIndex) {
                                        return event.target.value;
                                    }

                                    return value;
                                });
                            }

                            return event.target.value;
                        })()
                    })
                }
                onBlur={() =>
                    dispatchFormAction({
                        action: "focus lost",
                        name: attribute.name,
                        fieldIndex: fieldIndex
                    })
                }
            />
            {(() => {
                if (fieldIndex === undefined) {
                    return null;
                }

                assert(Array.isArray(valueOrValues));

                const values = valueOrValues;

                return (
                    <>
                        <FieldErrors attribute={attribute} displayableErrors={displayableErrors} fieldIndex={fieldIndex} />
                        <AddRemoveButtonsMultiValuedAttribute
                            attribute={attribute}
                            values={values}
                            fieldIndex={fieldIndex}
                            dispatchFormAction={dispatchFormAction}
                            i18n={i18n}
                        />
                    </>
                );
            })()}
        </>
    );
}

function AddRemoveButtonsMultiValuedAttribute(props: {
    attribute: Attribute;
    values: string[];
    fieldIndex: number;
    dispatchFormAction: React.Dispatch<Extract<FormAction, { action: "update" }>>;
    i18n: I18n;
}) {
    const { attribute, values, fieldIndex, dispatchFormAction, i18n } = props;

    const { msg } = i18n;

    const { hasAdd, hasRemove } = getButtonToDisplayForMultivaluedAttributeField({
        attribute,
        values,
        fieldIndex
    });

    const idPostfix = `-${attribute.name}-${fieldIndex + 1}`;

    return (
        <>
            {hasRemove && (
                <>
                    <Button
                        id={`kc-remove${idPostfix}`}
                        type="button"
                        variant="link"
                        size="sm"
                        className="px-0"
                        onClick={() =>
                            dispatchFormAction({
                                action: "update",
                                name: attribute.name,
                                valueOrValues: values.filter((_, i) => i !== fieldIndex)
                            })
                        }
                    >
                        {msg("remove")}
                    </Button>
                    {hasAdd ? <>&nbsp;|&nbsp;</> : null}
                </>
            )}
            {hasAdd && (
                <Button
                    id={`kc-add${idPostfix}`}
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() =>
                        dispatchFormAction({
                            action: "update",
                            name: attribute.name,
                            valueOrValues: [...values, ""]
                        })
                    }
                >
                    {msg("addValue")}
                </Button>
            )}
        </>
    );
}

function InputTagSelects(props: InputFieldByTypeProps) {
    const { attribute, dispatchFormAction, i18n, valueOrValues } = props;

    const inputType = (() => {
        const { inputType } = attribute.annotations;

        assert(inputType === "select-radiobuttons" || inputType === "multiselect-checkboxes");

        switch (inputType) {
            case "select-radiobuttons":
                return "radio";
            case "multiselect-checkboxes":
                return "checkbox";
        }
    })();

    const options = (() => {
        walk: {
            const { inputOptionsFromValidation } = attribute.annotations;

            if (inputOptionsFromValidation === undefined) {
                break walk;
            }

            const validator = (attribute.validators as Record<string, { options?: string[] }>)[inputOptionsFromValidation];

            if (validator === undefined) {
                break walk;
            }

            if (validator.options === undefined) {
                break walk;
            }

            return validator.options;
        }

        return attribute.validators.options?.options ?? [];
    })();

    const onBlur = () =>
        dispatchFormAction({
            action: "focus lost",
            name: attribute.name,
            fieldIndex: undefined
        });

    const isInvalid = props.displayableErrors.length !== 0;

    const optionLabel = (option: string) => (
        <FieldLabel htmlFor={`${attribute.name}-${option}`} className="text-sm font-normal">
            {inputLabel(i18n, attribute, option)}
        </FieldLabel>
    );

    if (inputType === "radio") {
        return (
            <RadioGroup
                name={attribute.name}
                disabled={attribute.readOnly}
                value={Array.isArray(valueOrValues) ? (valueOrValues[valueOrValues.length - 1] ?? "") : valueOrValues}
                onValueChange={value =>
                    dispatchFormAction({
                        action: "update",
                        name: attribute.name,
                        valueOrValues: Array.isArray(valueOrValues) ? [...valueOrValues, value] : value
                    })
                }
            >
                {options.map(option => (
                    <Field key={option} orientation="horizontal" data-disabled={attribute.readOnly ? "true" : undefined}>
                        <RadioGroupItem id={`${attribute.name}-${option}`} value={option} aria-invalid={isInvalid} onBlur={onBlur} />
                        {optionLabel(option)}
                    </Field>
                ))}
            </RadioGroup>
        );
    }

    return (
        <>
            {options.map(option => (
                <Field key={option} orientation="horizontal" data-disabled={attribute.readOnly ? "true" : undefined}>
                    <Checkbox
                        id={`${attribute.name}-${option}`}
                        name={attribute.name}
                        value={option}
                        aria-invalid={isInvalid}
                        disabled={attribute.readOnly}
                        checked={Array.isArray(valueOrValues) ? valueOrValues.includes(option) : valueOrValues === option}
                        onCheckedChange={checked =>
                            dispatchFormAction({
                                action: "update",
                                name: attribute.name,
                                valueOrValues: (() => {
                                    const isChecked = checked === true;

                                    if (Array.isArray(valueOrValues)) {
                                        const newValues = [...valueOrValues];

                                        if (isChecked) {
                                            newValues.push(option);
                                        } else {
                                            newValues.splice(newValues.indexOf(option), 1);
                                        }

                                        return newValues;
                                    }

                                    return isChecked ? option : "";
                                })()
                            })
                        }
                        onBlur={onBlur}
                    />
                    {optionLabel(option)}
                </Field>
            ))}
        </>
    );
}

function TextareaTag(props: InputFieldByTypeProps) {
    const { attribute, dispatchFormAction, displayableErrors, valueOrValues } = props;

    assert(typeof valueOrValues === "string");

    const value = valueOrValues;

    return (
        <Textarea
            size="lg"
            id={attribute.name}
            name={attribute.name}
            aria-invalid={displayableErrors.length !== 0}
            disabled={attribute.readOnly}
            cols={attribute.annotations.inputTypeCols === undefined ? undefined : parseInt(`${attribute.annotations.inputTypeCols}`, 10)}
            rows={attribute.annotations.inputTypeRows === undefined ? undefined : parseInt(`${attribute.annotations.inputTypeRows}`, 10)}
            maxLength={
                attribute.annotations.inputTypeMaxlength === undefined ? undefined : parseInt(`${attribute.annotations.inputTypeMaxlength}`, 10)
            }
            value={value}
            onChange={event =>
                dispatchFormAction({
                    action: "update",
                    name: attribute.name,
                    valueOrValues: event.target.value
                })
            }
            onBlur={() =>
                dispatchFormAction({
                    action: "focus lost",
                    name: attribute.name,
                    fieldIndex: undefined
                })
            }
        />
    );
}

function SelectTag(props: InputFieldByTypeProps) {
    const { attribute, dispatchFormAction, displayableErrors, i18n, valueOrValues } = props;

    const isMultiple = attribute.annotations.inputType === "multiselect";

    return (
        <NativeSelect
            size="lg"
            id={attribute.name}
            name={attribute.name}
            className="w-full"
            aria-invalid={displayableErrors.length !== 0}
            disabled={attribute.readOnly}
            multiple={isMultiple}
            value={valueOrValues}
            onChange={event =>
                dispatchFormAction({
                    action: "update",
                    name: attribute.name,
                    valueOrValues: (() => {
                        if (isMultiple) {
                            return Array.from(event.target.selectedOptions).map(option => option.value);
                        }

                        return event.target.value;
                    })()
                })
            }
            onBlur={() =>
                dispatchFormAction({
                    action: "focus lost",
                    name: attribute.name,
                    fieldIndex: undefined
                })
            }
        >
            {!isMultiple && <NativeSelectOption value=""></NativeSelectOption>}
            {(() => {
                const options = (() => {
                    walk: {
                        const { inputOptionsFromValidation } = attribute.annotations;

                        if (inputOptionsFromValidation === undefined) {
                            break walk;
                        }

                        assert(typeof inputOptionsFromValidation === "string");

                        const validator = (attribute.validators as Record<string, { options?: string[] }>)[inputOptionsFromValidation];

                        if (validator === undefined) {
                            break walk;
                        }

                        if (validator.options === undefined) {
                            break walk;
                        }

                        return validator.options;
                    }

                    return attribute.validators.options?.options ?? [];
                })();

                return options.map(option => (
                    <NativeSelectOption key={option} value={option}>
                        {inputLabel(i18n, attribute, option)}
                    </NativeSelectOption>
                ));
            })()}
        </NativeSelect>
    );
}

function inputLabel(i18n: I18n, attribute: Attribute, option: string) {
    const { advancedMsg } = i18n;

    if (attribute.annotations.inputOptionLabels !== undefined) {
        const { inputOptionLabels } = attribute.annotations;

        return advancedMsg(inputOptionLabels[option] ?? option);
    }

    if (attribute.annotations.inputOptionLabelsI18nPrefix !== undefined) {
        return advancedMsg(`${attribute.annotations.inputOptionLabelsI18nPrefix}.${option}`);
    }

    return option;
}
