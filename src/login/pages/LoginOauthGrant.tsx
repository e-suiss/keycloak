import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function LoginOauthGrant(props: PageProps<Extract<KcContext, { pageId: "login-oauth-grant.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, classes, Template } = props;

    const { url, oauth, client } = kcContext;

    const { msg, msgStr, advancedMsg, advancedMsgStr } = i18n;

    const clientName = client.name ? advancedMsgStr(client.name) : client.clientId;
    const { tosUri, policyUri } = client.attributes;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={msg("ogTitle", clientName)}
        >
            <div id="kc-oauth" className="-mt-0.5 flex flex-col items-center">
                {oauth.clientScopesRequested.length !== 0 && (
                    <>
                        <p className="mb-2.5 w-full text-left text-[15px] leading-tight text-[#86868b]">{msg("ogRequest")}</p>
                        <ul className="w-full rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]">
                            {oauth.clientScopesRequested.map(clientScope => (
                                <li
                                    key={clientScope.consentScreenText + (clientScope.dynamicScopeParameter ?? "")}
                                    className="relative px-4 py-3.5 text-base leading-tight not-first:before:absolute not-first:before:inset-x-0 not-first:before:start-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-[#e5e5ea] dark:not-first:before:bg-[#38383a]"
                                >
                                    {advancedMsg(clientScope.consentScreenText)}
                                    {clientScope.dynamicScopeParameter && <>: {clientScope.dynamicScopeParameter}</>}
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {(tosUri || policyUri) && (
                    <p className="mt-5 text-[15px] leading-tight">
                        {tosUri && (
                            <a href={tosUri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {msg("ogTos")}
                            </a>
                        )}
                        {tosUri && policyUri && <span className="text-[#86868b]"> · </span>}
                        {policyUri && (
                            <a href={policyUri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {msg("ogPolicy")}
                            </a>
                        )}
                    </p>
                )}

                <form autoComplete="off" action={url.oauthAction} method="POST" className="mt-7 flex w-full flex-col gap-1.5">
                    <input type="hidden" name="code" value={oauth.code} />
                    <Button size="form" block name="accept" id="kc-login" type="submit" value={msgStr("doYes")}>
                        {msgStr("doYes")}
                    </Button>
                    <Button
                        variant="secondary"
                        size="form"
                        block
                        name="cancel"
                        id="kc-cancel"
                        type="submit"
                        value={msgStr("doNo")}
                        className="bg-[#e5e5ea] hover:bg-[#e5e5ea]/80 dark:bg-[#2c2c2e] dark:hover:bg-[#2c2c2e]/80"
                    >
                        {msgStr("doNo")}
                    </Button>
                </form>
            </div>
        </Template>
    );
}
