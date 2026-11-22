import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-config-totp.ftl" });

const meta = {
    title: "login/login-config-totp.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const withError = {
    messagesPerField: {
        get: (fieldName: string) => (fieldName === "totp" ? "Invalid authenticator code." : ""),
        exists: (fieldName: string) => fieldName === "totp",
        existsError: (fieldName: string, ...other: string[]) => [fieldName, ...other].includes("totp"),
        printIfExists: <T,>(fieldName: string, x: T) => (fieldName === "totp" ? x : undefined)
    }
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" } }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" } }} />
};

export const Manual_en: Story = {
    name: "Manual set up / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, mode: "manual" }} />
};

export const Manual_tr: Story = {
    name: "Manual set up / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, mode: "manual" }} />
};

export const WithError_en: Story = {
    name: "With error / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...withError }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...withError }} />
};

export const AppInitiated_tr: Story = {
    name: "App initiated / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, isAppInitiatedAction: true }} />
};
