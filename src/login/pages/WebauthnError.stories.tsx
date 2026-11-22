import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "webauthn-error.ftl" });

const meta = {
    title: "login/webauthn-error.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// The keycloakify mock starts as an app-initiated action; the defaults turn that off.

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, isAppInitiatedAction: false }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, isAppInitiatedAction: false }} />
};

export const AppInitiated_tr: Story = {
    name: "App initiated / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, isAppInitiatedAction: true }} />
};
