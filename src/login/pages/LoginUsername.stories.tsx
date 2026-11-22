import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-username.ftl" });

const meta = {
    title: "login/login-username.ftl",
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

const realm = { registrationAllowed: true };

const unknownUser = (text: string) => ({
    login: { username: "5551234567" },
    messagesPerField: {
        existsError: (fieldName: string, ...other: string[]) => [fieldName, ...other].includes("username"),
        get: (fieldName: string) => (fieldName === "username" ? text : ""),
        getFirstError: (...fieldNames: string[]) => (fieldNames.includes("username") ? text : "")
    }
});

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, realm, ...google }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, realm, ...google }} />
};

export const WithError_en: Story = {
    name: "With error / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, realm, ...google, ...unknownUser("Invalid phone number.") }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, realm, ...google, ...unknownUser("Geçersiz telefon numarası.") }} />
};
