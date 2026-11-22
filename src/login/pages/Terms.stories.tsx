import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "terms.ftl" });

const meta = {
    title: "login/terms.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// The realm supplies the text as its own `termsText` message.
const text = (html: string) => ({ "x-keycloakify": { messages: { termsText: html } } });

const shortTr = "<p>Hizmeti kullanarak <a href='https://ornek.com/kosullar'>Kullanım Koşulları</a>'nı ve <a href='https://ornek.com/gizlilik'>Gizlilik Politikası</a>'nı kabul etmiş olursunuz.</p>";

const longTr = [
    "<h4>1. Taraflar</h4><p>Bu koşullar, hizmeti kullanan kişi ile hizmet sağlayıcı arasındaki ilişkiyi düzenler.</p>",
    "<h4>2. Hesap güvenliği</h4><p>Hesabınıza ait bilgilerin gizliliğinden siz sorumlusunuz. Şüpheli bir işlem fark ettiğinizde bizimle iletişime geçin.</p>",
    "<h4>3. Kişisel veriler</h4><p>Kişisel verileriniz, KVKK kapsamında yalnızca hizmetin sunulması amacıyla işlenir ve saklanır.</p>",
    "<h4>4. Değişiklikler</h4><p>Koşullar güncellendiğinde, bir sonraki girişinizde yeniden onayınız istenir.</p>",
    "<h4>5. Yürürlük</h4><p>Bu koşullar, onayladığınız andan itibaren yürürlüğe girer.</p>"
].join("");

export const Default_en: Story = {
    name: "Default / en",
    render: () => (
        <KcPageStory
            kcContext={{
                locale: { currentLanguageTag: "en" },
                ...text("<p>By using the service you accept the <a href='https://example.com/terms'>Terms of Use</a> and the <a href='https://example.com/privacy'>Privacy Policy</a>.</p>")
            }}
        />
    )
};

export const Default_tr: Story = {
    name: "Default / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...text(shortTr) }} />
};

export const LongText_tr: Story = {
    name: "Long text / tr",
    render: () => <KcPageStory kcContext={{ locale: { currentLanguageTag: "tr" }, ...text(longTr) }} />
};
