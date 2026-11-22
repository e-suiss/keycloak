/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/content/ContentComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { lazy, Suspense, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { Spinner } from "@ui/components/spinner";
import type { MenuItem } from "../root/PageNav";
import type { ContentComponentParams } from "../routes";
import { joinPath } from "../utils/joinPath";
import { usePromise } from "../utils/usePromise";
import fetchContentJson from "./fetchContent";

function findComponent(content: MenuItem[], componentId: string): string | undefined {
    for (const item of content) {
        if ("path" in item && item.path.endsWith(componentId) && "modulePath" in item) {
            return item.modulePath;
        }
        if ("children" in item) {
            return findComponent(item.children, componentId);
        }
    }
    return undefined;
}

export const ContentComponent = () => {
    const context = useEnvironment();

    const [content, setContent] = useState<MenuItem[]>();
    const { componentId } = useParams<ContentComponentParams>();

    usePromise(signal => fetchContentJson({ signal, context }), setContent);
    const modulePath = useMemo(
        () => findComponent(content || [], componentId!),
        [content, componentId]
    );

    return modulePath && <Component modulePath={modulePath} />;
};

type ComponentProps = {
    modulePath: string;
};

const Component = ({ modulePath }: ComponentProps) => {
    const { environment } = useEnvironment();

    const Element = lazy(
        () => import(/* @vite-ignore */ joinPath(environment.resourceUrl, modulePath))
    );
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-24">
                    <Spinner className="size-6 text-muted-foreground" />
                </div>
            }
        >
            <Element />
        </Suspense>
    );
};

export default ContentComponent;
