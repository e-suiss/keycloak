package com.esuiss.keycloak.login.form;

import com.esuiss.keycloak.common.Phone;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.authenticators.browser.UsernamePasswordForm;
import org.keycloak.events.Details;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.UserModel;
import org.keycloak.services.managers.AuthenticationManager;
import org.keycloak.services.messages.Messages;

public class PhoneUsernameForm extends UsernamePasswordForm {

    public static final String ATTR_PHONE = "phoneNumber";
    public static final String ATTR_PHONE_VERIFIED = "phoneNumberVerified";

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        if (context.getUser() != null) {
            context.success();
            return;
        }
        super.authenticate(context);
    }

    @Override
    protected boolean validateForm(AuthenticationFlowContext context, MultivaluedMap<String, String> formData) {
        return validateUser(context, formData);
    }

    @Override
    public boolean validateUser(AuthenticationFlowContext context, MultivaluedMap<String, String> inputData) {
        String phone = Phone.normalize(inputData.getFirst(AuthenticationManager.FORM_USERNAME));
        if (phone != null) {
            UserModel user = context.getSession().users()
                    .searchForUserByUserAttributeStream(context.getRealm(), ATTR_PHONE, phone)
                    .filter(u -> "true".equals(u.getFirstAttribute(ATTR_PHONE_VERIFIED)))
                    .findFirst()
                    .orElse(null);
            if (user != null) {
                context.setUser(user);
                context.getEvent().detail(Details.USERNAME, phone);
                context.getAuthenticationSession().setAuthNote(ATTEMPTED_USERNAME, phone);
                return true;
            }
        }

        return super.validateUser(context, inputData);
    }

    @Override
    protected Response challenge(AuthenticationFlowContext context, MultivaluedMap<String, String> formData) {
        LoginFormsProvider forms = context.form();
        if (!formData.isEmpty()) {
            forms.setFormData(formData);
        }
        return forms.createLoginUsername();
    }

    @Override
    protected Response createLoginForm(LoginFormsProvider form) {
        return form.createLoginUsername();
    }

    @Override
    protected String getDefaultChallengeMessage(AuthenticationFlowContext context) {
        if (context.getRealm().isLoginWithEmailAllowed()) {
            return Messages.INVALID_USERNAME_OR_EMAIL;
        }
        return Messages.INVALID_USERNAME;
    }
}
