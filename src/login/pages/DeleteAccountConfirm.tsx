import { Button } from "@ui/components/button";
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from "@ui/components/item";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { Fragment } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function DeleteAccountConfirm(props: PageProps<Extract<KcContext, { pageId: "delete-account-confirm.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, triggered_from_aia } = kcContext;

    const { msg, msgStr } = i18n;

    const consequences = ["daItemData", "daItemSession", "daItemApp"] as const;

    return (
        <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={doUseDefaultCss} classes={classes} displayMessage={false} headerNode={msg("daTitle")}>
            <div className="flex flex-col gap-7">
                <ItemGroup variant="inset" className="rounded-xl border border-foreground/10 text-left dark:border-foreground/14 dark:bg-foreground/5">
                    {consequences.map((key, i) => (
                        <Fragment key={key}>
                            {i > 0 && <ItemSeparator className="bg-foreground/10 dark:bg-foreground/12" />}
                            <Item className="py-3">
                                <ItemContent>
                                    <ItemTitle className="text-sm leading-tight font-normal">{msg(key)}</ItemTitle>
                                </ItemContent>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>

                <form autoComplete="off" action={url.loginAction} method="post" className="flex flex-col gap-1.5">
                    <Button variant="destructive" size="form" block type="submit" className="bg-[#d70015] text-white hover:bg-[#d70015]/90 hover:text-white dark:bg-[#d70015] dark:hover:bg-[#d70015]/90 dark:hover:text-white">
                        {msgStr("daConfirm")}
                    </Button>
                    {triggered_from_aia && (
                        <Button variant="plain" size="form" block type="submit" name="cancel-aia" value="true">
                            {msgStr("daCancel")}
                        </Button>
                    )}
                </form>
            </div>
        </Template>
    );
}
