import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-oauth-grant.ftl" });

const meta = {
    title: "login/login-oauth-grant.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const grant = {
    url: { oauthAction: "/oauth-action" },
    oauth: {
        code: "mockCode",
        client: "nova-portal",
        clientScopesRequested: [{ consentScreenText: "${profileScopeConsentText}" }, { consentScreenText: "${emailScopeConsentText}" }]
    },
    client: {
        clientId: "nova-portal",
        name: "Nova Portal",
        attributes: { tosUri: "https://example.com/terms", policyUri: "https://example.com/privacy" }
    }
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...grant }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...grant }} />
};
