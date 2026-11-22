import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "terms-reconsent.ftl" });

const meta = {
    title: "login/terms-reconsent.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const terms = [
    {
        key: "tos",
        title: "Kullanım Koşulları",
        version: "v2",
        required: true,
        mustRead: true,
        content: "<h4>Kullanım Koşulları</h4><p>".concat("Lorem ipsum dolor sit amet. ".repeat(60), "</p>")
    },
    {
        key: "privacy",
        title: "Gizlilik Politikası",
        version: "v2",
        required: true,
        mustRead: false,
        content: "<h4>Gizlilik Politikası</h4><p>Kişisel verileriniz...</p>"
    },
    {
        key: "marketing",
        title: "Ticari Elektronik İleti İzni",
        version: "v1",
        required: false,
        mustRead: false,
        content: "<p>Kampanya bildirimleri almak ister misiniz?</p>"
    }
];

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, terms }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, terms }} />
};

export const SingleTerm_tr: Story = {
    name: "Single term / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, terms: [terms[0]] }} />
};
