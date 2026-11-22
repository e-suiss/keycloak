package com.esuiss.keycloak.registration.form;

import jakarta.ws.rs.core.MultivaluedMap;

import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormContext;
import org.keycloak.authentication.ValidationContext;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

public class RegistrationVerificationAction implements FormAction {

    public static final String TEST_CODE = "123456";
    public static final String FIELD_SMS_OTP = "smsOtp";
    public static final String FIELD_EMAIL_OTP = "emailOtp";
    public static final String ATTR_PHONE_VERIFIED = "phoneNumberVerified";

    @Override
    public void buildPage(FormContext context, LoginFormsProvider form) {

    }

    @Override
    public void validate(ValidationContext context) {

        context.success();
    }

    @Override
    public void success(FormContext context) {
        UserModel user = context.getUser();
        if (user == null) {
            return;
        }
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();
        if (TEST_CODE.equals(trim(form.getFirst(FIELD_EMAIL_OTP)))) {
            user.setEmailVerified(true);
        }
        if (TEST_CODE.equals(trim(form.getFirst(FIELD_SMS_OTP)))) {
            user.setSingleAttribute(ATTR_PHONE_VERIFIED, "true");
        }

        user.removeAttribute(FIELD_SMS_OTP);
        user.removeAttribute(FIELD_EMAIL_OTP);
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
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
