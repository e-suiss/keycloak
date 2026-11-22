package com.esuiss.keycloak.login.image;

import java.util.List;

import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel.Requirement;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

public class SecurityImageAuthenticatorFactory implements AuthenticatorFactory {

    public static final String PROVIDER_ID = "security-image";

    private static final SecurityImageAuthenticator INSTANCE = new SecurityImageAuthenticator();

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
        return "Security Image (sitekey)";
    }

    @Override
    public String getReferenceCategory() {
        return "security-image";
    }

    @Override
    public boolean isConfigurable() {
        return true;
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
        return "Shows an anti-phishing security image after the password step: first login lets the user pick one from the configured catalog, later logins ask them to confirm it.";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        ProviderConfigProperty imageUrls = new ProviderConfigProperty();
        imageUrls.setName(SecurityImageAuthenticator.CONFIG_IMAGE_URLS);
        imageUrls.setLabel("Security image URLs");
        imageUrls.setType(ProviderConfigProperty.MULTIVALUED_STRING_TYPE);
        imageUrls.setHelpText(
                "Catalog of image URLs shown to the user. On first login the user picks one as their "
                        + "anti-phishing security image; on later logins they confirm it. Leave empty to skip the step.");
        return List.of(imageUrls);
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
