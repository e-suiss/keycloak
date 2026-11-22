package com.esuiss.keycloak.login.reset;

import com.esuiss.keycloak.login.Phone;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.Authenticator;
import org.keycloak.events.Details;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.utils.FormMessage;
import org.keycloak.authentication.authenticators.browser.AbstractUsernameFormAuthenticator;

public class ResetPhoneChooseUserAuthenticator implements Authenticator {

    public static final String ATTR_PHONE = "phoneNumber";

    private static final String FIELD = "username";

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        context.challenge(context.form().createForm("login-reset-password.ftl"));
    }

    @Override
    public void action(AuthenticationFlowContext context) {
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();
        String phone = Phone.normalize(form.getFirst(FIELD));

        UserModel user = phone == null
                ? null
                : context.getSession().users()
                        .searchForUserByUserAttributeStream(context.getRealm(), ATTR_PHONE, phone)
                        .findFirst()
                        .orElse(null);

        if (user == null || !user.isEnabled()) {
            Response challenge = context.form()
                    .addError(new FormMessage(FIELD, "No account was found for this phone number."))
                    .createForm("login-reset-password.ftl");
            context.challenge(challenge);
            return;
        }

        context.setUser(user);
        context.getEvent().detail(Details.USERNAME, phone);
        context.getAuthenticationSession()
                .setAuthNote(AbstractUsernameFormAuthenticator.ATTEMPTED_USERNAME, phone);
        context.success();
    }


    @Override
    public boolean requiresUser() {
        return false;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return true;
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {

    }

    @Override
    public void close() {

    }
}
