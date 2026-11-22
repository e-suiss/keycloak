import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "register.ftl" });

const meta = {
    title: "login/register.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const terms = [
    {
        key: "kvkk",
        title: "KVKK Aydınlatma Metni",
        version: "1",
        required: true,
        mustRead: true,
        content: "<h4>Kişisel verilerin işlenmesi</h4><p>Kişisel verileriniz hizmetin sunulması amacıyla işlenir.</p>"
    },
    {
        key: "marketing",
        title: "Ticari elektronik ileti izni",
        version: "1",
        required: false,
        mustRead: false,
        content: "<p>Kampanya ve duyurulardan haberdar olmak için izin verebilirsiniz.</p>"
    }
];

const social = {
    providers: [{ loginUrl: "google", alias: "google", providerId: "google", displayName: "Google", iconClasses: "fa fa-google" }]
};

const phoneTaken = (text: string) => ({
    messagesPerField: {
        existsError: (fieldName: string, ...other: string[]) => [fieldName, ...other].includes("username"),
        getFirstError: (...fieldNames: string[]) => (fieldNames.includes("username") ? text : ""),
        get: (fieldName: string) => (fieldName === "username" ? text : "")
    }
});

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" } }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" } }} />
};

export const WithTermsAndSocial_tr: Story = {
    name: "With terms and social / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, terms, social }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...phoneTaken("Bu telefon numarası zaten kayıtlı.") }} />
};
