// @ts-nocheck
/**
 * "Sözleşmeler" (Consents) account page.
 *
 * Custom page (not provided by keycloak-account-ui). Renders the terms the
 * current user has accepted — including older versions — by calling the
 * consents SPI:  GET /realms/{realm}/consents/me
 *
 * Wired in via:
 *   - account/assets/content.ts   (sidebar menu item, label "consents")
 *   - account/routes.tsx          (route path "consents")
 *   - account/i18n/messages_*.properties (label + column translations)
 */

import { FileTextIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@ui/components/empty";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { request } from "../api/request";
import { Page } from "../components/page/Page";
import { joinPath } from "../utils/joinPath";
import { usePromise } from "../utils/usePromise";

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

export const Consents = () => {
    const { t } = useTranslation();
    const context = useEnvironment();

    const [data, setData] = useState<ConsentResponse>();
    const [selected, setSelected] = useState<ConsentItem>();

    usePromise(async signal => {
        const { environment } = context;
        const fullUrl = new URL(
            joinPath(
                environment.serverBaseUrl,
                "realms",
                environment.realm,
                "consents",
                "me"
            )
        );
        const response = await request("", context, { signal }, fullUrl);
        if (!response.ok) {
            return { username: "", items: [] } as ConsentResponse;
        }
        return (await response.json()) as ConsentResponse;
    }, setData);

    if (!data) {
        return (
            <div className="flex justify-center py-24">
                <Spinner className="size-6 text-muted-foreground" />
            </div>
        );
    }

    return (
        <Page title={t("consents")} description={t("consentsDescription")}>
            <div className="space-y-7">
                {data.items.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FileTextIcon />
                            </EmptyMedia>
                            <EmptyTitle>{t("consentsEmpty")}</EmptyTitle>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <section>
                        <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                            {t("consents")}
                        </h3>
                        <ItemGroup variant="inset">
                            {data.items.map((item, index) => (
                                <Fragment key={`${item.key}-${item.fingerprint}-${index}`}>
                                    {index > 0 && <ItemSeparator />}
                                    <Item size="sm" role="listitem">
                                        <ItemMedia variant="icon">
                                            <FileTextIcon />
                                        </ItemMedia>
                                        <ItemContent className="min-w-0">
                                            <ItemTitle>{item.title}</ItemTitle>
                                            <ItemDescription className="tabular-nums">
                                                {t("consentsColAcceptedAt")}:{" "}
                                                {item.acceptedAt ?? "-"}
                                            </ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                            {item.current ? (
                                                <Badge variant="outline">
                                                    {t("consentsStatusCurrent")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    {t("consentsStatusOutdated")}
                                                </Badge>
                                            )}
                                            <Button
                                                variant="tinted"
                                                size="sm"
                                                disabled={!item.content}
                                                onClick={() => setSelected(item)}
                                            >
                                                {t("consentsView")}
                                            </Button>
                                        </ItemActions>
                                    </Item>
                                </Fragment>
                            ))}
                        </ItemGroup>
                    </section>
                )}
            </div>

            {selected && (
                <Modal open onOpenChange={o => !o && setSelected(undefined)}>
                    <ModalContent>
                        <ModalHeader>
                            <ModalTitle>{selected.title}</ModalTitle>
                        </ModalHeader>
                        <ModalBody className="max-h-[60svh] overflow-y-auto">
                            <div className="mb-4 flex items-center gap-2">
                                {selected.current ? (
                                                <Badge variant="outline">
                                                    {t("consentsStatusCurrent")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    {t("consentsStatusOutdated")}
                                                </Badge>
                                            )}
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {t("consentsColAcceptedAt")}: {selected.acceptedAt ?? "-"}
                                </span>
                            </div>
                            <div
                                // The content is admin-authored HTML stored in the realm archive.
                                dangerouslySetInnerHTML={{ __html: selected.content ?? "" }}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button onClick={() => setSelected(undefined)}>{t("close")}</Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}
        </Page>
    );
};

export default Consents;
