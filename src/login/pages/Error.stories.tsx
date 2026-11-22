import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "error.ftl" });

const meta = {
    title: "login/error.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, message: { type: "error", summary: "Invalid request." } }} />
};

export const WithoutMessage_en: Story = {
    name: "Without message / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, message: { type: "error", summary: "" } }} />
};

export const WithSkipLink_en: Story = {
    name: "With skip link / en",
    render: () => (
        <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, message: { type: "error", summary: "Invalid request." }, skipLink: true }} />
    )
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, message: { type: "error", summary: "Geçersiz istek." } }} />
};

export const WithoutMessage_tr: Story = {
    name: "Without message / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, message: { type: "error", summary: "" } }} />
};

export const WithSkipLink_tr: Story = {
    name: "With skip link / tr",
    render: () => (
        <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, message: { type: "error", summary: "Geçersiz istek." }, skipLink: true }} />
    )
};
