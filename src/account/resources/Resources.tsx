/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/resources/Resources.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Page } from "../components/page/Page";
import { ResourcesTab } from "./ResourcesTab";

export const Resources = () => {
    const { t } = useTranslation();
    const [activeTabKey, setActiveTabKey] = useState(0);

    return (
        <Page title={t("resources")} description={t("resourceIntroMessage")}>
            <div className="space-y-7">
                <Tabs
                    value={String(activeTabKey)}
                    onValueChange={value => setActiveTabKey(Number(value))}
                >
                    <TabsList>
                        <TabsTrigger value="0" data-testid="myResources">
                            {t("myResources")}
                        </TabsTrigger>
                        <TabsTrigger value="1" data-testid="sharedWithMe">
                            {t("sharedWithMe")}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                {activeTabKey === 0 ? <ResourcesTab /> : <ResourcesTab isShared />}
            </div>
        </Page>
    );
};

export default Resources;
