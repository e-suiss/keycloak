import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "phone-otp.ftl" });

const meta = {
    title: "login/phone-otp.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// The server sends the number already masked.
const phoneNumber = "5** *** ** 67";

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, phoneNumber }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, phoneNumber }} />
};

export const WithError_tr: Story = {
    name: "With error / tr",
    render: () => (
        <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, phoneNumber, message: { type: "error", summary: "Kod hatalı. 2 deneme hakkınız kaldı." } }} />
    )
};
