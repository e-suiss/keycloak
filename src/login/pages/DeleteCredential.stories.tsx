import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "delete-credential.ftl" });

const meta = {
    title: "login/delete-credential.ftl",
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
                credentialLabel: "Security key",
                url: { loginAction: "/login-action" }
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
                credentialLabel: "Güvenlik anahtarı",
                url: { loginAction: "/login-action" }
            }}
        />
    )
};
