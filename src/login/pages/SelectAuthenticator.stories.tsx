import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "select-authenticator.ftl" });

const meta = {
    title: "login/select-authenticator.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const auth = {
    authenticationSelections: [
        {
            authExecId: "password",
            displayName: "auth-username-password-form-display-name",
            helpText: "auth-username-password-form-help-text",
            iconCssClass: "kcAuthenticatorPasswordClass" as const
        },
        {
            authExecId: "otp",
            displayName: "otp-display-name",
            helpText: "otp-help-text",
            iconCssClass: "kcAuthenticatorOTPClass" as const
        },
        {
            authExecId: "passkey",
            displayName: "webauthn-passwordless-display-name",
            helpText: "webauthn-passwordless-help-text",
            iconCssClass: "kcAuthenticatorWebAuthnPasswordlessClass" as const
        }
    ]
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, auth }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, auth }} />
};
