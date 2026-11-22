package com.esuiss.keycloak.authz;

import org.keycloak.Config;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.services.resource.RealmResourceProvider;
import org.keycloak.services.resource.RealmResourceProviderFactory;

public class AuthzResourceProviderFactory implements RealmResourceProviderFactory {

    public static final String ID = "pdp";

    @Override
    public RealmResourceProvider create(KeycloakSession session) {
        return new AuthzResourceProvider(session);
    }

    @Override
    public String getId() {
        return ID;
    }

    @Override
    public void init(Config.Scope config) {

    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {

    }

    @Override
    public void close() {

    }
}
