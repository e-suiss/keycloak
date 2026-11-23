/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/context/KeycloakContext.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Spinner } from "@ui/components/spinner";
import { Keycloak } from "oidc-spa/keycloak-js";
import {
    createContext,
    type PropsWithChildren,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { AlertProvider } from "../alerts/Alerts";
import { ErrorPage } from "./ErrorPage";
import type { BaseEnvironment } from "./environment";
import { Help } from "./HelpContext";

export type KeycloakContext<T extends BaseEnvironment = BaseEnvironment> =
    KeycloakContextProps<T> & {
        keycloak: Keycloak;
    };

const createKeycloakEnvContext = <T extends BaseEnvironment>() =>
    createContext<KeycloakContext<T> | undefined>(undefined);

let KeycloakEnvContext: any;

export const useEnvironment = <T extends BaseEnvironment = BaseEnvironment>() => {
    const context = useContext<KeycloakContext<T>>(KeycloakEnvContext);
    if (!context)
        throw Error(
            "no environment provider in the hierarchy make sure to add the provider"
        );
    return context;
};

interface KeycloakContextProps<T extends BaseEnvironment> {
    environment: T;
    keycloak?: Keycloak;
    fallback?: ReactNode;
}

export const KeycloakProvider = <T extends BaseEnvironment>({
    environment,
    keycloak: externalKeycloak,
    fallback,
    children
}: PropsWithChildren<KeycloakContextProps<T>>) => {
    KeycloakEnvContext = createKeycloakEnvContext<T>();
    const calledOnce = useRef(false);
    const [init, setInit] = useState(!!externalKeycloak);
    const [error, setError] = useState<unknown>();
    const keycloak = useMemo(() => {
        if (externalKeycloak) {
            return externalKeycloak;
        }
        const keycloak = new Keycloak({
            url: environment.serverBaseUrl,
            realm: environment.realm,
            clientId: environment.clientId
        });

        return keycloak;
    }, [environment, externalKeycloak]);

    useEffect(() => {
        // Skip initialization if using external keycloak (already initialized)
        if (externalKeycloak) {
            return;
        }

        // only needed in dev mode
        if (calledOnce.current) {
            return;
        }

        const init = () =>
            keycloak.init({
                onLoad: "login-required",
                pkceMethod: "S256",

                scope: environment.scope
            });

        init()
            .then(() => setInit(true))
            .catch(error => setError(error));

        calledOnce.current = true;
    }, [keycloak, externalKeycloak, environment.scope]);

    if (error) {
        return <ErrorPage error={error} />;
    }

    if (!init) {
        if (fallback !== undefined) return <>{fallback}</>;
        return (
            <div className="grid min-h-screen place-items-center bg-background">
                <Spinner className="size-6" />
            </div>
        );
    }

    return (
        <KeycloakEnvContext.Provider value={{ environment, keycloak }}>
            <AlertProvider>
                <Help>{children}</Help>
            </AlertProvider>
        </KeycloakEnvContext.Provider>
    );
};
