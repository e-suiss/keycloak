package com.esuiss.keycloak.registration.policy;

import org.keycloak.Config;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.policy.PasswordPolicyProvider;
import org.keycloak.policy.PasswordPolicyProviderFactory;

public class PinStrengthPolicyProviderFactory implements PasswordPolicyProviderFactory {

    public static final String ID = "pinStrength";

    private static final PinStrengthPolicyProvider INSTANCE = new PinStrengthPolicyProvider();

    @Override
    public PasswordPolicyProvider create(KeycloakSession session) {
        return INSTANCE;
    }

    @Override
    public String getId() {
        return ID;
    }

    @Override
    public String getDisplayName() {
        return "Weak PIN block (sequential / repeated / birth date / ID number / phone)";
    }

    @Override
    public String getConfigType() {

        return null;
    }

    @Override
    public String getDefaultConfigValue() {
        return "";
    }

    @Override
    public boolean isMultiplSupported() {
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
