package com.esuiss.keycloak.registration.action;

import org.keycloak.Config;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

public class CompleteRegistrationActionFactory implements RequiredActionFactory {

    private static final CompleteRegistrationAction INSTANCE = new CompleteRegistrationAction();

    @Override
    public String getId() {
        return CompleteRegistrationAction.PROVIDER_ID;
    }

    @Override
    public String getDisplayText() {
        return "Complete Registration (phone/email verification + password)";
    }

    @Override
    public RequiredActionProvider create(KeycloakSession session) {
        return INSTANCE;
    }

    @Override
    public boolean isOneTimeAction() {
        return false;
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
