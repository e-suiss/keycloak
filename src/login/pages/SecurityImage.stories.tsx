import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";
import { SECURITY_IMAGES } from "../../shared/securityImages";

const { KcPageStory } = createKcPageStory({ pageId: "security-image.ftl" });

const meta = {
    title: "login/security-image.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const images = Object.keys(SECURITY_IMAGES);

export const Select_en: Story = {
    name: "Select / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, mode: "SELECT", images }} />
};

export const Select_tr: Story = {
    name: "Select / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, mode: "SELECT", images }} />
};

export const Confirm_en: Story = {
    name: "Confirm / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, mode: "CONFIRM", selectedImage: images[1] }} />
};

export const Confirm_tr: Story = {
    name: "Confirm / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, mode: "CONFIRM", selectedImage: images[1] }} />
};
