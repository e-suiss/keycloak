import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "code.ftl" });

const meta = {
    title: "login/code.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success_en: Story = {
    name: "Success / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, code: { success: true, code: "XYZ789" } }} />
};

export const ErrorMessage_en: Story = {
    name: "Error message / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, code: { success: false, error: "The code has expired." } }} />
};

export const ErrorNoMessage_en: Story = {
    name: "Error (no message) / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, code: { success: false } }} />
};

export const Success_tr: Story = {
    name: "Success / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, code: { success: true, code: "XYZ789" } }} />
};

export const ErrorMessage_tr: Story = {
    name: "Error message / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, code: { success: false, error: "Kodun süresi doldu." } }} />
};

export const ErrorNoMessage_tr: Story = {
    name: "Error (no message) / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, code: { success: false } }} />
};
