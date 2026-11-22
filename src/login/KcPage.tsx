import { useI18n } from "./i18n";
import type { KcContext } from "./KcContext";
import Template from "./Template";
import "../globals.css";
import DefaultPage from "keycloakify/login/DefaultPage";

// Pages are imported eagerly, not with React.lazy: every login step is a full page load, and React 19
// holds back content that suspended for up to 300 ms (Suspense throttling), a blank screen on each step.
// The whole login bundle is cached after the first page, so this costs one download.

import UserProfileFormFields from "./UserProfileFormFields";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Info from "./pages/Info";
import Error from "./pages/Error";
import LoginResetPassword from "./pages/LoginResetPassword";
import LoginVerifyEmail from "./pages/LoginVerifyEmail";
import Terms from "./pages/Terms";
import LoginOauth2DeviceVerifyUserCode from "./pages/LoginOauth2DeviceVerifyUserCode";
import LoginOauthGrant from "./pages/LoginOauthGrant";
import LoginOtp from "./pages/LoginOtp";
import LoginUsername from "./pages/LoginUsername";
import LoginPassword from "./pages/LoginPassword";
import WebauthnAuthenticate from "./pages/WebauthnAuthenticate";
import WebauthnRegister from "./pages/WebauthnRegister";
import LoginUpdatePassword from "./pages/LoginUpdatePassword";
import LinkIdpAction from "./pages/LinkIdpAction";
import LoginUpdateProfile from "./pages/LoginUpdateProfile";
import LoginIdpLinkConfirm from "./pages/LoginIdpLinkConfirm";
import LoginIdpLinkConfirmOverride from "./pages/LoginIdpLinkConfirmOverride";
import LoginIdpLinkEmail from "./pages/LoginIdpLinkEmail";
import LoginPageExpired from "./pages/LoginPageExpired";
import LoginConfigTotp from "./pages/LoginConfigTotp";
import LogoutConfirm from "./pages/LogoutConfirm";
import IdpReviewUserProfile from "./pages/IdpReviewUserProfile";
import UpdateEmail from "./pages/UpdateEmail";
import SelectAuthenticator from "./pages/SelectAuthenticator";
import SamlPostForm from "./pages/SamlPostForm";
import DeleteCredential from "./pages/DeleteCredential";
import Code from "./pages/Code";
import DeleteAccountConfirm from "./pages/DeleteAccountConfirm";
import FrontchannelLogout from "./pages/FrontchannelLogout";
import LoginRecoveryAuthnCodeConfig from "./pages/LoginRecoveryAuthnCodeConfig";
import LoginRecoveryAuthnCodeInput from "./pages/LoginRecoveryAuthnCodeInput";
import LoginResetOtp from "./pages/LoginResetOtp";
import LoginX509Info from "./pages/LoginX509Info";
import WebauthnError from "./pages/WebauthnError";
import LoginPasskeysConditionalAuthenticate from "./pages/LoginPasskeysConditionalAuthenticate";
import SelectOrganization from "./pages/SelectOrganization";

// Custom pages (our multi-terms / registration SPI required actions).
import CompleteRegistration from "./pages/CompleteRegistration";
import TermsReconsent from "./pages/TermsReconsent";

// Custom pages (our login-flow SPI authenticators).
import SecurityImage from "./pages/SecurityImage";
import PhoneOtp from "./pages/PhoneOtp";

const doMakeUserConfirmPassword = true;

export default function KcPage(props: { kcContext: KcContext }) {
    const { kcContext } = props;

    // Default the login UI to Turkish. i18n stays intact — the other configured
    // languages (en, fr, es) still render when explicitly requested via
    // ?kc_locale=xx; we only override Keycloak's browser-based negotiation so
    // the default is always Turkish. Skipped inside Storybook (iframe.html) so
    // the per-language stories keep previewing their own locale.
    if (
        kcContext.locale !== undefined &&
        typeof window !== "undefined" &&
        !window.location.pathname.includes("iframe.html") &&
        !new URLSearchParams(window.location.search).has("kc_locale")
    ) {
        kcContext.locale.currentLanguageTag = "tr";
    }

    const { i18n } = useI18n({ kcContext });

    const common = { i18n, Template, doUseDefaultCss: false };

    const withUserProfile = {
        ...common,
        UserProfileFormFields,
        doMakeUserConfirmPassword
    };

    return (
        <>
            {(() => {
                switch (kcContext.pageId) {
                    case "login.ftl":
                        return <Login kcContext={kcContext} {...common} />;
                    case "login-username.ftl":
                        return <LoginUsername kcContext={kcContext} {...common} />;
                    case "login-password.ftl":
                        return <LoginPassword kcContext={kcContext} {...common} />;
                    case "register.ftl":
                        return <Register kcContext={kcContext} {...withUserProfile} />;
                    case "info.ftl":
                        return <Info kcContext={kcContext} {...common} />;
                    case "error.ftl":
                        return <Error kcContext={kcContext} {...common} />;
                    case "login-reset-password.ftl":
                        return <LoginResetPassword kcContext={kcContext} {...common} />;
                    case "login-verify-email.ftl":
                        return <LoginVerifyEmail kcContext={kcContext} {...common} />;
                    case "terms.ftl":
                        return <Terms kcContext={kcContext} {...common} />;
                    case "login-oauth2-device-verify-user-code.ftl":
                        return (
                            <LoginOauth2DeviceVerifyUserCode
                                kcContext={kcContext}
                                {...common}
                            />
                        );
                    case "login-oauth-grant.ftl":
                        return <LoginOauthGrant kcContext={kcContext} {...common} />;
                    case "login-otp.ftl":
                        return <LoginOtp kcContext={kcContext} {...common} />;
                    case "webauthn-authenticate.ftl":
                        return <WebauthnAuthenticate kcContext={kcContext} {...common} />;
                    case "webauthn-register.ftl":
                        return <WebauthnRegister kcContext={kcContext} {...common} />;
                    case "login-update-password.ftl":
                        return <LoginUpdatePassword kcContext={kcContext} {...common} />;
                    case "link-idp-action.ftl":
                        return <LinkIdpAction kcContext={kcContext} {...common} />;
                    case "login-update-profile.ftl":
                        return (
                            <LoginUpdateProfile
                                kcContext={kcContext}
                                {...withUserProfile}
                            />
                        );
                    case "login-idp-link-confirm.ftl":
                        return <LoginIdpLinkConfirm kcContext={kcContext} {...common} />;
                    case "login-idp-link-confirm-override.ftl":
                        return (
                            <LoginIdpLinkConfirmOverride
                                kcContext={kcContext}
                                {...common}
                            />
                        );
                    case "login-idp-link-email.ftl":
                        return <LoginIdpLinkEmail kcContext={kcContext} {...common} />;
                    case "login-page-expired.ftl":
                        return <LoginPageExpired kcContext={kcContext} {...common} />;
                    case "login-config-totp.ftl":
                        return <LoginConfigTotp kcContext={kcContext} {...common} />;
                    case "logout-confirm.ftl":
                        return <LogoutConfirm kcContext={kcContext} {...common} />;
                    case "idp-review-user-profile.ftl":
                        return (
                            <IdpReviewUserProfile
                                kcContext={kcContext}
                                {...withUserProfile}
                            />
                        );
                    case "update-email.ftl":
                        return <UpdateEmail kcContext={kcContext} {...withUserProfile} />;
                    case "select-authenticator.ftl":
                        return <SelectAuthenticator kcContext={kcContext} {...common} />;
                    case "saml-post-form.ftl":
                        return <SamlPostForm kcContext={kcContext} {...common} />;
                    case "delete-credential.ftl":
                        return <DeleteCredential kcContext={kcContext} {...common} />;
                    case "code.ftl":
                        return <Code kcContext={kcContext} {...common} />;
                    case "delete-account-confirm.ftl":
                        return <DeleteAccountConfirm kcContext={kcContext} {...common} />;
                    case "frontchannel-logout.ftl":
                        return <FrontchannelLogout kcContext={kcContext} {...common} />;
                    case "login-recovery-authn-code-config.ftl":
                        return (
                            <LoginRecoveryAuthnCodeConfig
                                kcContext={kcContext}
                                {...common}
                            />
                        );
                    case "login-recovery-authn-code-input.ftl":
                        return (
                            <LoginRecoveryAuthnCodeInput
                                kcContext={kcContext}
                                {...common}
                            />
                        );
                    case "login-reset-otp.ftl":
                        return <LoginResetOtp kcContext={kcContext} {...common} />;
                    case "login-x509-info.ftl":
                        return <LoginX509Info kcContext={kcContext} {...common} />;
                    case "webauthn-error.ftl":
                        return <WebauthnError kcContext={kcContext} {...common} />;
                    case "login-passkeys-conditional-authenticate.ftl":
                        return (
                            <LoginPasskeysConditionalAuthenticate
                                kcContext={kcContext}
                                {...common}
                            />
                        );
                    case "select-organization.ftl":
                        return <SelectOrganization kcContext={kcContext} {...common} />;
                    case "complete-registration.ftl":
                        return <CompleteRegistration kcContext={kcContext} {...common} />;
                    case "terms-reconsent.ftl":
                        return <TermsReconsent kcContext={kcContext} {...common} />;
                    case "security-image.ftl":
                        return <SecurityImage kcContext={kcContext} {...common} />;
                    case "phone-otp.ftl":
                        return <PhoneOtp kcContext={kcContext} {...common} />;
                    default:
                        return <DefaultPage kcContext={kcContext} {...withUserProfile} />;
                }
            })()}
        </>
    );
}
