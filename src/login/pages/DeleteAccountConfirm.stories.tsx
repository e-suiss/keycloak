import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "delete-account-confirm.ftl" });

const meta = {
    title: "login/delete-account-confirm.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithAIAFlow_en: Story = {
    name: "With AIA flow / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                triggered_from_aia: true,
                url: { loginAction: "/login-action" }
            }}
        />
    )
};

export const WithoutAIAFlow_en: Story = {
    name: "Without AIA flow / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                triggered_from_aia: false,
                url: { loginAction: "/login-action" }
            }}
        />
    )
};

export const WithAIAFlow_tr: Story = {
    name: "With AIA flow / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                triggered_from_aia: true,
                url: { loginAction: "/login-action" }
            }}
        />
    )
};

export const WithoutAIAFlow_tr: Story = {
    name: "Without AIA flow / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                triggered_from_aia: false,
                url: { loginAction: "/login-action" }
            }}
        />
    )
};
