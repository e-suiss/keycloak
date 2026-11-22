import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "info.ftl" });

const meta = {
    title: "login/info.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default_en: Story = {
    name: "Default / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                messageHeader: undefined,
                message: { type: "info", summary: "" },
                client: { baseUrl: "https://app.example.com" }
            }}
        />
    )
};

export const WithMessage_en: Story = {
    name: "With message / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                messageHeader: undefined,
                message: { type: "info", summary: "Your email address has been verified." },
                client: { baseUrl: "https://app.example.com" }
            }}
        />
    )
};

export const WithRequiredActions_en: Story = {
    name: "With required actions / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                messageHeader: undefined,
                message: { type: "info", summary: "Complete the following action(s):" },
                requiredActions: ["UPDATE_PASSWORD", "VERIFY_EMAIL"],
                actionUri: "/login-action"
            }}
        />
    )
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                messageHeader: undefined,
                message: { type: "info", summary: "" },
                client: { baseUrl: "https://app.example.com" }
            }}
        />
    )
};

export const WithMessage_tr: Story = {
    name: "With message / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                messageHeader: undefined,
                message: { type: "info", summary: "E-posta adresiniz doğrulandı." },
                client: { baseUrl: "https://app.example.com" }
            }}
        />
    )
};

export const WithRequiredActions_tr: Story = {
    name: "With required actions / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                messageHeader: undefined,
                message: { type: "info", summary: "Şu işlemleri tamamlayın:" },
                requiredActions: ["UPDATE_PASSWORD", "VERIFY_EMAIL"],
                actionUri: "/login-action"
            }}
        />
    )
};
