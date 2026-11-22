package com.esuiss.keycloak.terms;

import org.keycloak.Config;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

public class MultiTermsRequiredActionFactory implements RequiredActionFactory {

    private static final MultiTermsRequiredAction INSTANCE = new MultiTermsRequiredAction();

    @Override
    public RequiredActionProvider create(KeycloakSession session) {
        return INSTANCE;
    }

    @Override
    public String getId() {
        return MultiTermsRequiredAction.PROVIDER_ID;
    }

    @Override
    public String getDisplayText() {
        return "Terms & Conditions re-consent";
    }

    @Override
    public boolean isOneTimeAction() {
        return true;
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
