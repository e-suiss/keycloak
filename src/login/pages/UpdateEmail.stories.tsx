import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "update-email.ftl" });

const meta = {
    title: "login/update-email.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// Keycloak pre-fills the current address. (The keycloakify mock only accepts gmail.com addresses.)
const profile = { attributesByName: { email: { value: "deniz.yilmaz@gmail.com" } } };

const invalidEmail = (text: string) => ({
    messagesPerField: {
        existsError: (fieldName: string, ...other: string[]) => [fieldName, ...other].includes("email"),
        get: (fieldName: string) => (fieldName === "email" ? text : ""),
        exists: (fieldName: string) => fieldName === "email",
        getFirstError: (...fieldNames: string[]) => (fieldNames.includes("email") ? text : "")
    }
});

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, profile }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, profile }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...invalidEmail("Geçersiz e-posta adresi.") }} />
};

export const AppInitiated_tr: Story = {
    name: "App initiated / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, profile, isAppInitiatedAction: true }} />
};
