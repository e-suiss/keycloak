import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-otp.ftl" });

const meta = {
    title: "login/login-otp.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const twoDevices = {
    otpLogin: {
        userOtpCredentials: [
            { id: "phone", userLabel: "Telefonum" },
            { id: "tablet", userLabel: "iPad" }
        ],
        selectedCredentialId: "phone"
    }
};

const oneDevice = { otpLogin: { userOtpCredentials: [{ id: "phone", userLabel: "Telefonum" }], selectedCredentialId: "phone" } };

const invalidCode = (text: string) => ({
    messagesPerField: {
        existsError: (fieldName: string, ...other: string[]) => [fieldName, ...other].includes("totp"),
        get: (fieldName: string) => (fieldName === "totp" ? text : "")
    }
});

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...oneDevice }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...oneDevice }} />
};

export const MultipleDevices_en: Story = {
    name: "Multiple devices / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...twoDevices }} />
};

export const MultipleDevices_tr: Story = {
    name: "Multiple devices / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...twoDevices }} />
};

export const WithError_en: Story = {
    name: "With error / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, ...oneDevice, ...invalidCode("Invalid authenticator code.") }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...oneDevice, ...invalidCode("Geçersiz doğrulama kodu.") }} />
};
