package com.esuiss.keycloak.login.otp;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.Authenticator;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

public class PhoneOtpAuthenticator implements Authenticator {

    public static final String ATTR_PHONE = "phoneNumber";
    public static final String ATTR_PHONE_VERIFIED = "phoneNumberVerified";

    private static final String FIELD_OTP = "otp";

    @Override
    public void authenticate(AuthenticationFlowContext context) {

        if (!hasVerifiedPhone(context.getUser())) {
            context.success();
            return;
        }
        OtpCodes.ensureCodeSent(context, phoneOf(context.getUser()));
        context.challenge(buildForm(context, null));
    }

    @Override
    public void action(AuthenticationFlowContext context) {
        if (!hasVerifiedPhone(context.getUser())) {
            context.success();
            return;
        }
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();
        String code = trim(form.getFirst(FIELD_OTP));
        switch (OtpCodes.verify(context, code, phoneOf(context.getUser()))) {
            case VALID -> context.success();
            case INVALID -> context.challenge(buildForm(context, "invalidOtp"));
            case EXPIRED -> context.challenge(buildForm(context, "otpExpiredNewSent"));
            case CANCELLED_NEW_SENT -> context.challenge(buildForm(context, "otpCancelledNewSent"));
        }
    }

    private Response buildForm(AuthenticationFlowContext context, String error) {
        var form = context.form()
                .setAttribute("phoneNumber", mask(phoneOf(context.getUser())));
        if (error != null) {
            form.setError(error);
        }
        return form.createForm("phone-otp.ftl");
    }

    private static String phoneOf(UserModel user) {
        if (user == null) {
            return null;
        }
        String phone = user.getFirstAttribute(ATTR_PHONE);
        return isBlank(phone) ? user.getUsername() : phone;
    }

    private static String mask(String phone) {
        if (phone == null) {
            return "";
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 2) {
            return phone;
        }
        int keep = 2;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digits.length() - keep; i++) {
            sb.append('•');
        }
        sb.append(digits.substring(digits.length() - keep));
        return sb.toString();
    }

    private static boolean hasVerifiedPhone(UserModel user) {
        return user != null
                && !isBlank(user.getFirstAttribute(ATTR_PHONE))
                && "true".equals(user.getFirstAttribute(ATTR_PHONE_VERIFIED));
    }

    @Override
    public boolean requiresUser() {
        return true;
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

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
