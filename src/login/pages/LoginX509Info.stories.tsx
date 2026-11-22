import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-x509-info.ftl" });

const meta = {
    title: "login/login-x509-info.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const x509 = (isUserEnabled: boolean) => ({
    formData: {
        subjectDN: "CN=Ahmet Yılmaz, O=Örnek A.Ş.",
        username: "ahmet.yilmaz",
        isUserEnabled
    }
});

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, x509: x509(true) }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, x509: x509(true) }} />
};

export const UserNotEnabled_tr: Story = {
    name: "User not enabled / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, x509: x509(false) }} />
};
