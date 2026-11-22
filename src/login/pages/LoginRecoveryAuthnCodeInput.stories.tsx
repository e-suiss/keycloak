import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-recovery-authn-code-input.ftl" });

const meta = {
    title: "login/login-recovery-authn-code-input.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const bean = { recoveryAuthnCodesInputBean: { codeNumber: 3 } };

const invalidCode = (text: string) => ({
    messagesPerField: {
        existsError: (fieldName: string, ...other: string[]) => [fieldName, ...other].includes("recoveryCodeInput"),
        get: (fieldName: string) => (fieldName === "recoveryCodeInput" ? text : "")
    }
});

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...bean }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...bean }} />
};

export const WithError_en: Story = {
    name: "With error / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...bean, ...invalidCode("Invalid recovery code.") }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...bean, ...invalidCode("Geçersiz kurtarma kodu.") }} />
};
