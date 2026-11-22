package com.esuiss.keycloak.login.form;

import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.authenticators.browser.PasswordFormFactory;
import org.keycloak.models.KeycloakSession;

public class PhonePasswordFormFactory extends PasswordFormFactory {

    public static final String PROVIDER_ID = "phone-password-form";

    @Override
    public Authenticator create(KeycloakSession session) {
        return new PhonePasswordForm(session);
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getDisplayType() {
        return "PIN Form";
    }

    @Override
    public String getHelpText() {
        return "Password step that sends an account-locked notice to the user's phone "
                + "when brute-force protection trips.";
    }
}
