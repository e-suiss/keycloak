import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "logout-confirm.ftl" });

const meta = {
    title: "login/logout-confirm.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const withBackLink = { client: { baseUrl: "https://ornek.com" }, logoutConfirm: { code: "mock-session-code", skipLink: false } };

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...withBackLink }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...withBackLink }} />
};

export const WithoutBackLink_tr: Story = {
    name: "Without back link / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, logoutConfirm: { code: "mock-session-code", skipLink: true } }} />
};
