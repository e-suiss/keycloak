package com.esuiss.keycloak.authz;

import org.keycloak.models.KeycloakSession;
import org.keycloak.services.resource.RealmResourceProvider;

public class AuthzResourceProvider implements RealmResourceProvider {

    private final KeycloakSession session;

    public AuthzResourceProvider(KeycloakSession session) {
        this.session = session;
    }

    @Override
    public Object getResource() {
        return new AuthzResource(session);
    }

    @Override
    public void close() {

    }
}
