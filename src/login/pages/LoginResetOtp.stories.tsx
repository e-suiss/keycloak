import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-reset-otp.ftl" });

const meta = {
    title: "login/login-reset-otp.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const configuredOtpCredentials = {
    userOtpCredentials: [
        { id: "phone", userLabel: "Telefonum" },
        { id: "tablet", userLabel: "iPad" }
    ],
    selectedCredentialId: "phone"
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, configuredOtpCredentials }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, configuredOtpCredentials }} />
};
