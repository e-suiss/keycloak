import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "webauthn-authenticate.ftl" });

const meta = {
    title: "login/webauthn-authenticate.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const withKeys = {
    shouldDisplayAuthenticators: true,
    authenticators: {
        authenticators: [
            {
                credentialId: "key-1",
                label: "YubiKey 5",
                createdAt: "12.03.2026",
                transports: { iconClass: "kcAuthenticatorUsbIcon", displayNameProperties: ["USB"] }
            },
            {
                credentialId: "key-2",
                label: "iPhone",
                createdAt: "02.05.2026",
                transports: { iconClass: "kcAuthenticatorDefaultIcon", displayNameProperties: [] }
            }
        ]
    }
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...withKeys }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...withKeys }} />
};

export const WithoutList_tr: Story = {
    name: "Without list / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" } }} />
};
