/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/PasswordInput.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput
} from "@ui/components/input-group";
import {
    type ComponentProps,
    forwardRef,
    type MutableRefObject,
    type Ref,
    useState
} from "react";
import { useTranslation } from "react-i18next";

export type PasswordInputProps = ComponentProps<typeof InputGroupInput> & {
    hasReveal?: boolean;
};

const PasswordInputBase = ({
    hasReveal = true,
    innerRef,
    ...rest
}: PasswordInputProps) => {
    const { t } = useTranslation();
    const [hidePassword, setHidePassword] = useState(true);
    return (
        <InputGroup>
            <InputGroupInput
                {...rest}
                type={hidePassword ? "password" : "text"}
                ref={innerRef}
            />
            {hasReveal && (
                <InputGroupAddon align="inline-end">
                    <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("showPassword")}
                        onClick={() => setHidePassword(!hidePassword)}
                    >
                        {hidePassword ? <EyeIcon /> : <EyeSlashIcon />}
                    </InputGroupButton>
                </InputGroupAddon>
            )}
        </InputGroup>
    );
};

export const PasswordInput = forwardRef(
    (props: PasswordInputProps, ref: Ref<HTMLInputElement>) => (
        <PasswordInputBase {...props} innerRef={ref as MutableRefObject<any>} />
    )
);
PasswordInput.displayName = "PasswordInput";
