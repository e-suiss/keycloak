import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-passkeys-conditional-authenticate.ftl" });

const meta = {
    title: "login/login-passkeys-conditional-authenticate.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const withPasskey = {
    shouldDisplayAuthenticators: true,
    authenticators: {
        authenticators: [{ credentialId: "cred-1", label: "Passkey", createdAt: "12.03.2026", transports: { iconClass: "", displayNameProperties: [] } }]
    }
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...withPasskey }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...withPasskey }} />
};

export const NoAuthenticators_en: Story = {
    name: "No authenticators / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" } }} />
};

export const NoAuthenticators_tr: Story = {
    name: "No authenticators / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" } }} />
};
