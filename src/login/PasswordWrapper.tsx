import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { InputGroup, InputGroupAddon, InputGroupButton } from "@ui/components/input-group";
import type { JSX } from "keycloakify/tools/JSX";
import { useIsPasswordRevealed } from "keycloakify/tools/useIsPasswordRevealed";
import type { I18n } from "./i18n";

/** Password field with a reveal toggle. `children` is an `<InputGroupInput>`. */
export function PasswordWrapper(props: { i18n: I18n; passwordInputId: string; children: JSX.Element }) {
    const { i18n, passwordInputId, children } = props;
    const { msgStr } = i18n;
    const { isPasswordRevealed, toggleIsPasswordRevealed } = useIsPasswordRevealed({ passwordInputId });

    return (
        <InputGroup size="lg">
            {children}
            <InputGroupAddon align="inline-end">
                <InputGroupButton
                    size="icon-xs"
                    className="size-7 text-muted-foreground"
                    tabIndex={-1}
                    aria-label={msgStr(isPasswordRevealed ? "hidePassword" : "showPassword")}
                    aria-controls={passwordInputId}
                    onClick={toggleIsPasswordRevealed}
                >
                    {isPasswordRevealed ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
}
