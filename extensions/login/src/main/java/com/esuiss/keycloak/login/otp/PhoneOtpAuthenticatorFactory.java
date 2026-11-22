package com.esuiss.keycloak.login.otp;

import java.util.List;

import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel.Requirement;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

public class PhoneOtpAuthenticatorFactory implements AuthenticatorFactory {

    public static final String PROVIDER_ID = "phone-otp";

    private static final PhoneOtpAuthenticator INSTANCE = new PhoneOtpAuthenticator();

    private static final Requirement[] REQUIREMENT_CHOICES = {
            Requirement.REQUIRED,
            Requirement.DISABLED
    };

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public Authenticator create(KeycloakSession session) {
        return INSTANCE;
    }

    @Override
    public String getDisplayType() {
        return "Phone OTP (SMS code)";
    }

    @Override
    public String getReferenceCategory() {
        return "otp";
    }

    @Override
    public boolean isConfigurable() {
        return false;
    }

    @Override
    public Requirement[] getRequirementChoices() {
        return REQUIREMENT_CHOICES;
    }

    @Override
    public boolean isUserSetupAllowed() {
        return false;
    }

    @Override
    public String getHelpText() {
        return "Sends a 6-digit one-time code to the user's phone (3 min validity, 3 wrong entries cancel the code) and verifies it. Delivery is a log stub.";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return List.of();
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
