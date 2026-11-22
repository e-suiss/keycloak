import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "link-idp-action.ftl" });

const meta = {
    title: "login/link-idp-action.ftl",
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
                idpDisplayName: "Google",
                url: { loginAction: "/mock-login-action" }
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
                idpDisplayName: "Google",
                url: { loginAction: "/mock-login-action" }
            }}
        />
    )
};
