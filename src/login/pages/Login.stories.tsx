import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login.ftl" });

const meta = {
    title: "login/login.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const google = {
    social: {
        displayInfo: true,
        providers: [{ loginUrl: "google", alias: "google", providerId: "google", displayName: "Google", iconClasses: "fa fa-google" }]
    }
};

const invalidCredentials = {
    login: { username: "5551234567" },
    messagesPerField: {
        existsError: (fieldName: string, ...otherFieldNames: string[]) => {
            const fieldNames = [fieldName, ...otherFieldNames];
            return fieldNames.includes("username") || fieldNames.includes("password");
        },
        get: (fieldName: string) => (fieldName === "username" || fieldName === "password" ? "Invalid username or password." : "")
    }
};

const realm = { rememberMe: true, resetPasswordAllowed: true, registrationAllowed: true };

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, realm, ...google }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, realm, ...google }} />
};

export const WithoutSocial_en: Story = {
    name: "Without social / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, realm }} />
};

export const WithoutSocial_tr: Story = {
    name: "Without social / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, realm }} />
};

export const InvalidCredential_en: Story = {
    name: "Invalid credential / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, realm, ...google, ...invalidCredentials }} />
};

export const InvalidCredential_tr: Story = {
    name: "Invalid credential / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, realm, ...google, ...invalidCredentials }} />
};

const masterRealm = { ...realm, name: "master", registrationAllowed: false, resetPasswordAllowed: false };

export const MasterRealm_en: Story = {
    name: "Master realm (admin) / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, realm: masterRealm }} />
};

export const MasterRealm_tr: Story = {
    name: "Master realm (admin) / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, realm: masterRealm }} />
};
