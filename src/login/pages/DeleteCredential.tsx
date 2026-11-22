import { Button } from "@ui/components/button";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@ui/components/item";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function DeleteCredential(props: PageProps<Extract<KcContext, { pageId: "delete-credential.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msgStr, msg } = i18n;

    const { url, credentialLabel } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={msg("dcTitle", credentialLabel)}
        >
            <div className="flex flex-col gap-7">
                <Item
                    variant="outline"
                    className="rounded-2xl border-foreground/10 bg-muted px-4 py-3.5 text-left dark:border-foreground/14 dark:bg-foreground/5"
                >
                    <ItemContent className="min-w-0 gap-0.5">
                        <ItemTitle className="truncate text-[15px] leading-tight font-normal">{credentialLabel}</ItemTitle>
                        <ItemDescription className="text-[13px] leading-tight">{msg("dcItemHint")}</ItemDescription>
                    </ItemContent>
                </Item>

                <form autoComplete="off" action={url.loginAction} method="POST" className="flex flex-col gap-1.5">
                    <Button
                        variant="destructive"
                        size="form"
                        block
                        name="accept"
                        id="kc-accept"
                        type="submit"
                        value={msgStr("doConfirmDelete")}
                        className="bg-[#d70015] text-white hover:bg-[#d70015]/90 hover:text-white dark:bg-[#d70015] dark:hover:bg-[#d70015]/90 dark:hover:text-white"
                    >
                        {msgStr("dcConfirm")}
                    </Button>
                    <Button variant="plain" size="form" block name="cancel-aia" value="true" id="kc-decline" type="submit">
                        {msgStr("dcCancel")}
                    </Button>
                </form>
            </div>
        </Template>
    );
}
