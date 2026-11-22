import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "complete-registration.ftl" });

const meta = {
    title: "login/complete-registration.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Identity_en: Story = {
    name: "Identity / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                step: "IDENTITY",
                firstName: "",
                lastName: "",
                tc: "",
                birthDate: "",
                phoneNumber: "",
                userEmail: "",
                terms: [
                    { key: "kvkk", title: "Privacy Notice", version: "1", required: true, mustRead: true, content: "<p>Personal data is processed in line with the privacy notice.</p>" },
                    { key: "tos", title: "Terms of Use", version: "1", required: true, mustRead: false, content: "<p>By using the service you accept the terms of use.</p>" }
                ]
            }}
        />
    )
};

export const Phone_en: Story = {
    name: "Phone / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, step: "PHONE", phoneNumber: "", userEmail: "" }} />
};

export const PhoneOtp_en: Story = {
    name: "Phone OTP / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, step: "PHONE_OTP", phoneNumber: "5321234567", userEmail: "" }} />
};

export const Email_en: Story = {
    name: "Email / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, step: "EMAIL", phoneNumber: "5321234567", userEmail: "" }} />
};

export const EmailOtp_en: Story = {
    name: "Email OTP / en",
    render: () => (
        <KcPageStory
            kcContext={{ locale: { currentLanguageTag: "en" }, step: "EMAIL_OTP", phoneNumber: "5321234567", userEmail: "ali@example.com" }}
        />
    )
};

export const Password_en: Story = {
    name: "Password / en",
    render: () => (
        <KcPageStory
            kcContext={{ locale: { currentLanguageTag: "en" }, step: "PASSWORD", phoneNumber: "5321234567", userEmail: "ali@example.com" }}
        />
    )
};

export const Error_en: Story = {
    name: "Error / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                step: "PHONE_OTP",
                phoneNumber: "5321234567",
                userEmail: "",
                message: { type: "error", summary: "The verification code is incorrect." }
            }}
        />
    )
};

export const Identity_tr: Story = {
    name: "Identity / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                step: "IDENTITY",
                firstName: "",
                lastName: "",
                tc: "",
                birthDate: "",
                phoneNumber: "",
                userEmail: "",
                terms: [
                    { key: "kvkk", title: "KVKK Aydınlatma Metni", version: "1", required: true, mustRead: true, content: "<p>Kişisel verileriniz aydınlatma metnine uygun olarak işlenir.</p>" },
                    { key: "tos", title: "Kullanım Koşulları", version: "1", required: true, mustRead: false, content: "<p>Hizmeti kullanarak kullanım koşullarını kabul edersiniz.</p>" }
                ]
            }}
        />
    )
};

export const Phone_tr: Story = {
    name: "Phone / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, step: "PHONE", phoneNumber: "", userEmail: "" }} />
};

export const PhoneOtp_tr: Story = {
    name: "Phone OTP / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, step: "PHONE_OTP", phoneNumber: "5321234567", userEmail: "" }} />
};

export const Email_tr: Story = {
    name: "Email / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, step: "EMAIL", phoneNumber: "5321234567", userEmail: "" }} />
};

export const EmailOtp_tr: Story = {
    name: "Email OTP / tr",
    render: () => (
        <KcPageStory
            kcContext={{ locale: { currentLanguageTag: "tr" }, step: "EMAIL_OTP", phoneNumber: "5321234567", userEmail: "ali@example.com" }}
        />
    )
};

export const Password_tr: Story = {
    name: "Password / tr",
    render: () => (
        <KcPageStory
            kcContext={{ locale: { currentLanguageTag: "tr" }, step: "PASSWORD", phoneNumber: "5321234567", userEmail: "ali@example.com" }}
        />
    )
};

export const Error_tr: Story = {
    name: "Error / tr",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "tr" },
                step: "PHONE_OTP",
                phoneNumber: "5321234567",
                userEmail: "",
                message: { type: "error", summary: "Doğrulama kodu hatalı." }
            }}
        />
    )
};
