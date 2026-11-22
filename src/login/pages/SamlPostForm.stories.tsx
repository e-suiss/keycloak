import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "saml-post-form.ftl" });

const meta = {
    title: "login/saml-post-form.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// samlPost.url stays "#" in the mock, so the page does not post itself away.
export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" } }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" } }} />
};
