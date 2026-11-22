import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "select-organization.ftl" });

const meta = {
    title: "login/select-organization.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const user = {
    organizations: [
        { alias: "ornek-holding", name: "Örnek Holding A.Ş." },
        { alias: "ornek-teknoloji", name: "Örnek Teknoloji" },
        { alias: "ornek-lojistik" }
    ]
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, user }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, user }} />
};
