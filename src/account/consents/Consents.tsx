// @ts-nocheck

import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { request } from "../api/request";
import { Page } from "../components/page/Page";
import { joinPath } from "../utils/joinPath";

type ConsentItem = {
    key: string;
    title: string;
    fingerprint: string;
    acceptedAtEpoch: number;
    acceptedAt: string | null;
    current: boolean;
    content: string | null;
};

type ConsentResponse = {
    username: string;
    email?: string;
    items: ConsentItem[];
};

type State =
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; items: ConsentItem[] };

const GROUP = "w-full overflow-hidden rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";

function SectionLabel({ children }: { children: ReactNode }) {
    return <div className="ms-0.5 text-[13px] font-medium text-muted-foreground">{children}</div>;
}

function Message({ title, description }: { title: string; description: string }) {
    return (
        <div className="pt-12 text-center">
            <div className="text-[22px] font-semibold tracking-[-0.02em]">{title}</div>
            <p className="mt-2 text-base leading-[1.45] text-muted-foreground">{description}</p>
        </div>
    );
}

function Skeleton() {
    const rows = [
        ["55%", "30%"],
        ["40%", "26%"],
        ["48%", "34%"]
    ];
    return (
        <div className={`mt-2 ${GROUP}`} aria-busy="true">
            {rows.map(([title, date], index) => (
                <Fragment key={index}>
                    {index > 0 && <div className={SEPARATOR} />}
                    <div className="flex min-h-16 flex-col justify-center gap-2 px-4 py-3.5">
                        <div
                            className="h-3.5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]"
                            style={{ width: title }}
                        />
                        <div
                            className="h-2.5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]"
                            style={{ width: date }}
                        />
                    </div>
                </Fragment>
            ))}
        </div>
    );
}

export const Consents = () => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const [state, setState] = useState<State>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<ConsentItem>();

    useEffect(() => {
        const controller = new AbortController();
        const { environment } = context;
        const url = new URL(
            joinPath(environment.serverBaseUrl, "realms", environment.realm, "consents", "me")
        );
        setState({ status: "loading" });
        request("", context, { signal: controller.signal }, url)
            .then(async response => {
                if (!response.ok) throw new Error(String(response.status));
                const data = (await response.json()) as ConsentResponse;
                setState({ status: "ready", items: data.items ?? [] });
            })
            .catch(error => {
                if (error?.name !== "AbortError") setState({ status: "error" });
            });
        return () => controller.abort();
    }, [attempt]);

    const status = (item: ConsentItem) =>
        item.current ? t("consentsStatusCurrent") : t("consentsStatusOutdated");

    const acceptedAt = (item: ConsentItem) =>
        `${t("consentsColAcceptedAt")}: ${item.acceptedAt ?? "—"}`;

    return (
        <Page title={t("consents")} description={t("consentsDescription")}>
            <SectionLabel>{t("consents")}</SectionLabel>

            {state.status === "loading" && <Skeleton />}

            {state.status === "error" && (
                <div className="mt-2">
                    <Message
                        title={t("consentsLoadError")}
                        description={t("consentsLoadErrorDescription")}
                    />
                    <Button
                        size="form"
                        block
                        className="mt-6.5"
                        onClick={() => setAttempt(n => n + 1)}
                    >
                        {t("tryAgain")}
                    </Button>
                </div>
            )}

            {state.status === "ready" && state.items.length === 0 && (
                <div className="mt-2">
                    <Message title={t("consentsEmpty")} description={t("consentsEmptyDescription")} />
                </div>
            )}

            {state.status === "ready" && state.items.length > 0 && (
                <ul className={`mt-2 ${GROUP}`}>
                    {state.items.map((item, index) => (
                        <li key={`${item.key}-${item.fingerprint}-${index}`}>
                            {index > 0 && <div className={SEPARATOR} />}
                            <button
                                type="button"
                                disabled={!item.content}
                                onClick={() => setSelected(item)}
                                className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 disabled:cursor-default dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-base font-medium">
                                        {item.title}
                                    </span>
                                    <span className="mt-0.5 block text-[13px] text-muted-foreground tabular-nums">
                                        {acceptedAt(item)}
                                    </span>
                                </span>
                                <span
                                    className={`flex shrink-0 items-center gap-3.5 text-sm font-medium ${
                                        item.current
                                            ? "text-[#248a3d] dark:text-[#32d74b]"
                                            : "text-[#b25000] dark:text-[#ff9f0a]"
                                    }`}
                                >
                                    {status(item)}
                                    <CaretRightIcon className="size-3.5 text-[#c7c7cc] dark:text-[#48484a]" />
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selected && (
                <Modal open onOpenChange={open => !open && setSelected(undefined)}>
                    <ModalContent className="sm:max-w-95 sm:gap-3 sm:rounded-[20px] sm:p-5.5">
                        <ModalHeader className="group-has-data-[slot=drawer-close-button]/drawer-popup:ps-5.5 group-data-[swipe-axis=y]/drawer-popup:text-start">
                            <ModalTitle className="text-[17px] font-semibold">
                                {selected.title}
                            </ModalTitle>
                        </ModalHeader>
                        <ModalBody className="max-md:px-5.5 max-md:pt-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="rounded-full border border-[#8e8e93] px-2.5 py-0.75 text-xs font-semibold">
                                    {status(selected)}
                                </span>
                                <span className="text-[13px] text-muted-foreground tabular-nums">
                                    {acceptedAt(selected)}
                                </span>
                            </div>
                            <div
                                className="mt-4 max-h-[50svh] overflow-y-auto text-[15px] leading-[1.55] [&_h3]:mt-3 [&_h3]:font-semibold [&_p+p]:mt-2"
                                dangerouslySetInnerHTML={{ __html: selected.content ?? "" }}
                            />
                            <Button
                                size="form"
                                block
                                className="mt-5"
                                onClick={() => setSelected(undefined)}
                            >
                                {t("close")}
                            </Button>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            )}
        </Page>
    );
};

export default Consents;
