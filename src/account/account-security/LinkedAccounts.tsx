/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/account-security/LinkedAccounts.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { getLinkedAccounts, type LinkedAccountQueryParams } from "../api/methods";
import type { LinkedAccountRepresentation } from "../api/representations";
import { Page } from "../components/page/Page";
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from "@ui/components/item";
import { usePromise } from "../utils/usePromise";
import { AccountRow } from "./AccountRow";
import { LinkedAccountsToolbar } from "./LinkedAccountsToolbar";

export const LinkedAccounts = () => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountRepresentation[]>(
        []
    );
    const [unlinkedAccounts, setUninkedAccounts] = useState<
        LinkedAccountRepresentation[]
    >([]);

    const [paramsUnlinked, setParamsUnlinked] = useState<LinkedAccountQueryParams>({
        first: 0,
        max: 6,
        linked: false
    });
    const [paramsLinked, setParamsLinked] = useState<LinkedAccountQueryParams>({
        first: 0,
        max: 6,
        linked: true
    });
    const [key, setKey] = useState(1);
    const refresh = () => setKey(key + 1);

    usePromise(
        signal => getLinkedAccounts({ signal, context }, paramsUnlinked),
        setUninkedAccounts,
        [paramsUnlinked, key]
    );

    usePromise(
        signal => getLinkedAccounts({ signal, context }, paramsLinked),
        setLinkedAccounts,
        [paramsLinked, key]
    );

    return (
        <Page title={t("linkedAccounts")} description={t("linkedAccountsIntroMessage")}>
            <div className="space-y-7">
                <div>
                    <div className="mb-2 flex items-center justify-end">
                        <LinkedAccountsToolbar
                            onFilter={search =>
                                setParamsLinked({ ...paramsLinked, first: 0, search })
                            }
                            count={linkedAccounts.length}
                            first={paramsLinked.first}
                            max={paramsLinked.max}
                            onNextClick={() => {
                                setParamsLinked({
                                    ...paramsLinked,
                                    first: paramsLinked.first + paramsLinked.max - 1
                                });
                            }}
                            onPreviousClick={() =>
                                setParamsLinked({
                                    ...paramsLinked,
                                    first: paramsLinked.first - paramsLinked.max + 1
                                })
                            }
                            onPerPageSelect={(first, max) =>
                                setParamsLinked({
                                    ...paramsLinked,
                                    first,
                                    max
                                })
                            }
                            hasNext={linkedAccounts.length > paramsLinked.max - 1}
                        />
                    </div>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {t("linkedLoginProviders")}
                    </h3>
                    <ItemGroup
                        variant="inset"
                        id="linked-idps"
                        aria-label={t("linkedLoginProviders")}
                    >
                        {linkedAccounts.length > 0 ? (
                            linkedAccounts.map(
                                (account, index) =>
                                    index !== paramsLinked.max - 1 && (
                                        <Fragment key={account.providerName}>
                                            {index > 0 && <ItemSeparator />}
                                            <AccountRow
                                                account={account}
                                                isLinked
                                                refresh={refresh}
                                            />
                                        </Fragment>
                                    )
                            )
                        ) : (
                            <Item size="sm" role="listitem">
                                <ItemContent>
                                    <ItemTitle className="font-normal text-muted-foreground">
                                        {t("linkedEmpty")}
                                    </ItemTitle>
                                </ItemContent>
                            </Item>
                        )}
                    </ItemGroup>
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-end">
                        <LinkedAccountsToolbar
                            onFilter={search =>
                                setParamsUnlinked({ ...paramsUnlinked, first: 0, search })
                            }
                            count={unlinkedAccounts.length}
                            first={paramsUnlinked.first}
                            max={paramsUnlinked.max}
                            onNextClick={() => {
                                setParamsUnlinked({
                                    ...paramsUnlinked,
                                    first: paramsUnlinked.first + paramsUnlinked.max - 1
                                });
                            }}
                            onPreviousClick={() =>
                                setParamsUnlinked({
                                    ...paramsUnlinked,
                                    first: paramsUnlinked.first - paramsUnlinked.max + 1
                                })
                            }
                            onPerPageSelect={(first, max) =>
                                setParamsUnlinked({
                                    ...paramsUnlinked,
                                    first,
                                    max
                                })
                            }
                            hasNext={unlinkedAccounts.length > paramsUnlinked.max - 1}
                        />
                    </div>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {t("unlinkedLoginProviders")}
                    </h3>
                    <ItemGroup
                        variant="inset"
                        id="unlinked-idps"
                        aria-label={t("unlinkedLoginProviders")}
                    >
                        {unlinkedAccounts.length > 0 ? (
                            unlinkedAccounts.map(
                                (account, index) =>
                                    index !== paramsUnlinked.max - 1 && (
                                        <Fragment key={account.providerName}>
                                            {index > 0 && <ItemSeparator />}
                                            <AccountRow
                                            account={account}
                                            refresh={refresh}
                                        />
                                    </Fragment>
                                    )
                            )
                        ) : (
                            <Item size="sm" role="listitem">
                                <ItemContent>
                                    <ItemTitle className="font-normal text-muted-foreground">
                                        {t("unlinkedEmpty")}
                                    </ItemTitle>
                                </ItemContent>
                            </Item>
                        )}
                    </ItemGroup>
                </div>
            </div>
        </Page>
    );
};

export default LinkedAccounts;
