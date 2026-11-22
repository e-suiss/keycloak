package com.esuiss.keycloak.terms;

import org.keycloak.models.KeycloakSession;
import org.keycloak.services.resource.RealmResourceProvider;

public class ConsentsResourceProvider implements RealmResourceProvider {

    private final KeycloakSession session;

    public ConsentsResourceProvider(KeycloakSession session) {
        this.session = session;
    }

    @Override
    public Object getResource() {
        return new ConsentsResource(session);
    }

    @Override
    public void close() {

    }
}
