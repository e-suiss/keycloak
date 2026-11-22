import { FingerprintIcon } from "@phosphor-icons/react";
import { Fragment } from "react";
import type { I18n } from "./i18n";

type Authenticator = {
    label: string;
    createdAt: string;
    transports: { displayNameProperties?: string[] };
};

/** The user's registered passkeys / security keys, shown before asking the browser for one. */
export function AuthenticatorList(props: { authenticators: Authenticator[]; i18n: I18n }) {
    const { authenticators, i18n } = props;

    const { msg, advancedMsg } = i18n;

    return (
        <div className="flex w-full flex-col gap-2.5 text-left">
            <span className="px-1 text-[13px] leading-tight font-medium text-muted-foreground">{msg("pkAvailable")}</span>
            <ul className="overflow-hidden rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] dark:border-[#38383a] dark:bg-[#1c1c1e]">
                {authenticators.map((authenticator, i) => (
                    <li
                        key={i}
                        id={`kc-webauthn-authenticator-item-${i}`}
                        className="relative flex items-center gap-3 px-4 py-3.5 not-first:before:absolute not-first:before:inset-x-0 not-first:before:start-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-[#e5e5ea] dark:not-first:before:bg-[#38383a]"
                    >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e8e8ed] dark:bg-[#2c2c2e]">
                            <FingerprintIcon aria-hidden className="size-4.5" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span id={`kc-webauthn-authenticator-label-${i}`} className="truncate text-[15px] leading-tight font-medium">
                                {advancedMsg(authenticator.label)}
                            </span>
                            <span className="mt-0.5 text-[13px] leading-tight text-muted-foreground">
                                {authenticator.transports.displayNameProperties?.length ? (
                                    <span id={`kc-webauthn-authenticator-transport-${i}`}>
                                        {authenticator.transports.displayNameProperties.map((nameProperty, j, arr) => (
                                            <Fragment key={j}>
                                                {advancedMsg(nameProperty)}
                                                {j !== arr.length - 1 && ", "}
                                            </Fragment>
                                        ))}
                                        {" · "}
                                    </span>
                                ) : null}
                                <span id={`kc-webauthn-authenticator-createdlabel-${i}`}>{msg("pkCreated")} </span>
                                <span id={`kc-webauthn-authenticator-created-${i}`}>{authenticator.createdAt}</span>
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
