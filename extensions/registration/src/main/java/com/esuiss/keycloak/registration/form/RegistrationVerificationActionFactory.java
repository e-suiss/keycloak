package com.esuiss.keycloak.registration.form;

import org.keycloak.Config;
import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormActionFactory;
import org.keycloak.models.AuthenticationExecutionModel.Requirement;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

import java.util.List;

public class RegistrationVerificationActionFactory implements FormActionFactory {

    public static final String PROVIDER_ID = "registration-verification";

    private static final RegistrationVerificationAction INSTANCE = new RegistrationVerificationAction();

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public FormAction create(KeycloakSession session) {
        return INSTANCE;
    }

    @Override
    public String getDisplayType() {
        return "Registration OTP Verification Flags";
    }

    @Override
    public String getReferenceCategory() {
        return "verification";
    }

    @Override
    public boolean isConfigurable() {
        return false;
    }

    @Override
    public Requirement[] getRequirementChoices() {
        return new Requirement[]{Requirement.REQUIRED, Requirement.DISABLED};
    }

    @Override
    public boolean isUserSetupAllowed() {
        return false;
    }

    @Override
    public String getHelpText() {
        return "Marks e-mail (emailVerified) and phone (phoneNumberVerified) as verified when the registration OTP codes are correct.";
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
