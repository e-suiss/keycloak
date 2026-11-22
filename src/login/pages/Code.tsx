import { CheckIcon, CopyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText } from "@ui/components/input-group";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";

export default function Code(props: PageProps<Extract<KcContext, { pageId: "code.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { code, url } = kcContext;
    const { msg, msgStr } = i18n;

    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code.code ?? "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            headerNode={code.success ? msg("codeReadyTitle") : msg("codeFailedTitle")}
        >
            {code.success ? (
                <div className="flex flex-col gap-4">
                    <InputGroup size="lg">
                        <InputGroupText
                            id="code"
                            className="flex-1 select-all justify-center ps-4 text-foreground tabular-nums tracking-[0.4em] group-data-[size=lg]/input-group:text-xl"
                        >
                            {code.code}
                        </InputGroupText>
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                variant="default"
                                size="icon"
                                aria-label={msgStr(copied ? "codeCopied" : "copyCode")}
                                onClick={copy}
                            >
                                {copied ? <CheckIcon /> : <CopyIcon />}
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                    <p className="mt-0.5 text-center text-sm text-muted-foreground">{msg("codeCloseHint")}</p>
                </div>
            ) : (
                <div className="-mt-2 flex flex-col items-center gap-5 text-center">
                    {code.error && (
                        <p id="error" className="flex items-center gap-2 text-sm text-destructive">
                            <WarningCircleIcon className="size-4 shrink-0" />
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(code.error) }} />
                        </p>
                    )}
                    <Button variant="link" asChild>
                        <a href={url.loginUrl}>{msg("codeBackToLogin")}</a>
                    </Button>
                </div>
            )}
        </Template>
    );
}
