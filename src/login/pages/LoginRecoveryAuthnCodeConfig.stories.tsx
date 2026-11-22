import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-recovery-authn-code-config.ftl" });

const meta = {
    title: "login/login-recovery-authn-code-config.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const codes = ["a7k29xm4q8fz", "d3w6hn1rp5bt", "k9c4vx7ey2ld", "m1r8tq3sg6ja", "f5p0ws9uc4hk", "z2n7bd6vr8ym", "h8e3lk0qj1xo", "t4y6ga2ce9nw"];
const recoveryAuthnCodesConfigBean = {
    generatedRecoveryAuthnCodesList: codes,
    generatedRecoveryAuthnCodesAsString: codes.join(","),
    generatedAt: 1773273600000
};

export const Default_en: Story = {
    name: "Default / en",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "en" }, recoveryAuthnCodesConfigBean }} />
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, recoveryAuthnCodesConfigBean }} />
};

export const AppInitiated_tr: Story = {
    name: "App initiated / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, recoveryAuthnCodesConfigBean, isAppInitiatedAction: true }} />
};
