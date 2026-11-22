package com.esuiss.keycloak.login.form;

import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.authenticators.browser.UsernameFormFactory;
import org.keycloak.models.KeycloakSession;

public class PhoneUsernameFormFactory extends UsernameFormFactory {

    public static final String PROVIDER_ID = "phone-username-form";

    private static final PhoneUsernameForm SINGLETON = new PhoneUsernameForm();

    @Override
    public Authenticator create(KeycloakSession session) {
        return SINGLETON;
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getDisplayType() {
        return "Phone Form";
    }

    @Override
    public String getHelpText() {
        return "Username step that resolves the user by phone number "
                + "(phoneNumber attribute), falling back to username/e-mail.";
    }
}
