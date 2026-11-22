import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "webauthn-register.ftl" });

const meta = {
    title: "login/webauthn-register.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" } }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" } }} />
};

export const AppInitiated_tr: Story = {
    name: "App initiated / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, isAppInitiatedAction: true }} />
};
