/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/main.ts"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

export {
    type AddAlertFunction,
    type AddErrorFunction,
    type AlertProps,
    AlertProvider,
    AlertVariant,
    useAlerts
} from "./alerts/Alerts";
export { FormSubmitButton, type FormSubmitButtonProps } from "./buttons/FormSubmitButton";
export { ErrorPage } from "./context/ErrorPage";
export { type BaseEnvironment, getInjectedEnvironment } from "./context/environment";
export { Help, useHelp } from "./context/HelpContext";
export {
    type KeycloakContext,
    KeycloakProvider,
    useEnvironment
} from "./context/KeycloakContext";
export { ContinueCancelModal } from "./continue-cancel/ContinueCancelModal";
export {
    FileUploadControl,
    type FileUploadControlProps
} from "./controls/FileUploadControl";
export { FormErrorText, type FormErrorTextProps } from "./controls/FormErrorText";
export { HelpItem } from "./controls/HelpItem";
export { KeycloakSpinner } from "./controls/KeycloakSpinner";
export {
    KeycloakTextArea,
    type KeycloakTextAreaProps
} from "./controls/keycloak-text-area/KeycloakTextArea";
export { NumberControl } from "./controls/NumberControl";
export { OrganizationTable } from "./controls/OrganizationTable";
export { PasswordControl } from "./controls/PasswordControl";
export { PasswordInput } from "./controls/PasswordInput";
export { SwitchControl, type SwitchControlProps } from "./controls/SwitchControl";
export type {
    SelectControlOption,
    SelectControlProps
} from "./controls/select-control/SelectControl";
export { SelectControl, SelectVariant } from "./controls/select-control/SelectControl";
export { TextAreaControl } from "./controls/TextAreaControl";
export { TextControl } from "./controls/TextControl";
export { ListEmptyState } from "./controls/table/ListEmptyState";
export { IconMapper } from "./icons/IconMapper";
export { default as KeycloakMasthead } from "./masthead/Masthead";
export { FormPanel } from "./scroll-form/FormPanel";
export { mainPageContentId, ScrollForm } from "./scroll-form/ScrollForm";
export type { KeycloakSelectProps, Variant } from "./select/KeycloakSelect";
export { KeycloakSelect } from "./select/KeycloakSelect";
export { UserProfileFields } from "./user-profile/UserProfileFields";
export type { UserFormFields } from "./user-profile/utils";
export {
    beerify,
    debeerify,
    isUserProfileError,
    label,
    setUserProfileServerError
} from "./user-profile/utils";
export { createNamedContext } from "./utils/createNamedContext";
export type { FallbackProps } from "./utils/ErrorBoundary";
export {
    ErrorBoundaryFallback,
    ErrorBoundaryProvider,
    useErrorBoundary
} from "./utils/ErrorBoundary";
export {
    getErrorDescription,
    getErrorMessage,
    getNetworkErrorDescription,
    getNetworkErrorMessage
} from "./utils/errors";
export { generateId } from "./utils/generateId";
export { isDefined } from "./utils/isDefined";
export { useFetch } from "./utils/useFetch";
export { useRequiredContext } from "./utils/useRequiredContext";
export { useSetTimeout } from "./utils/useSetTimeout";
export { useStoredState } from "./utils/useStoredState";
