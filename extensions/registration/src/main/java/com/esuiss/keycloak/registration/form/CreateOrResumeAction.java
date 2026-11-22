package com.esuiss.keycloak.registration.form;

import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;

import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormContext;
import org.keycloak.authentication.ValidationContext;
import org.keycloak.events.Details;
import org.keycloak.events.Errors;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.utils.FormMessage;
import org.keycloak.protocol.oidc.OIDCLoginProtocol;
import org.keycloak.services.validation.Validation;
import org.keycloak.userprofile.UserProfile;
import org.keycloak.userprofile.UserProfileContext;
import org.keycloak.userprofile.UserProfileProvider;
import org.keycloak.userprofile.ValidationException;

import com.esuiss.keycloak.common.Phone;
import com.esuiss.keycloak.registration.action.CompleteRegistrationAction;

import java.util.ArrayList;
import java.util.List;

public class CreateOrResumeAction implements FormAction {

    public static final String ATTR_TC = "tc";
    public static final String ATTR_PHONE = "phoneNumber";
    public static final String ATTR_FIRST_NAME = "firstName";
    public static final String ATTR_LAST_NAME = "lastName";
    public static final String ATTR_BIRTH_DATE = "birthDate";

    @Override
    public void buildPage(FormContext context, LoginFormsProvider form) {

    }

    @Override
    public void validate(ValidationContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        context.getEvent().detail(Details.REGISTER_METHOD, "form");

        RealmModel realm = context.getRealm();
        String phone = Phone.normalize(formData.getFirst(ATTR_PHONE));

        if (phone == null) {
            context.error(Errors.INVALID_REGISTRATION);
            context.validationError(formData, List.of(new FormMessage(ATTR_PHONE, "invalidPhone")));
            return;
        }

        UserModel existing = findByAttribute(context.getSession(), realm, ATTR_PHONE, phone);
        if (existing != null) {
            if (CompleteRegistrationAction.nextStep(context.getSession(), realm, existing) == CompleteRegistrationAction.Step.DONE) {
                context.error(Errors.INVALID_REGISTRATION);
                context.validationError(formData,
                        List.of(new FormMessage(null, "registrationCompletedMessage")));
                return;
            }

            context.success();
            return;
        }

        List<FormMessage> errors = new ArrayList<>();

        UserProfileProvider provider = context.getSession().getProvider(UserProfileProvider.class);
        UserProfile profile = provider.create(UserProfileContext.REGISTRATION, withPhone(formData, phone));
        try {
            profile.validate();
        } catch (ValidationException pve) {
            errors.addAll(Validation.getFormErrorsFromValidation(pve.getErrors()));
        }

        if (!errors.isEmpty()) {
            context.error(Errors.INVALID_REGISTRATION);
            context.validationError(formData, errors);
            return;
        }
        context.success();
    }

    @Override
    public void success(FormContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        RealmModel realm = context.getRealm();
        String phone = Phone.normalize(formData.getFirst(ATTR_PHONE));

        UserModel existing = findByAttribute(context.getSession(), realm, ATTR_PHONE, phone);
        if (existing != null) {

            context.setUser(existing);
            context.getEvent().user(existing).detail(Details.USERNAME, existing.getUsername());
            return;
        }

        UserProfileProvider provider = context.getSession().getProvider(UserProfileProvider.class);
        UserProfile profile = provider.create(UserProfileContext.REGISTRATION, withPhone(formData, phone));
        UserModel user = profile.create();
        user.setEnabled(true);

        context.setUser(user);
        context.getAuthenticationSession().setClientNote(OIDCLoginProtocol.LOGIN_HINT_PARAM, user.getUsername());
        context.getEvent().user(user).detail(Details.USERNAME, user.getUsername());
    }

    private static MultivaluedMap<String, String> withPhone(MultivaluedMap<String, String> formData, String phone) {
        MultivaluedMap<String, String> data = new MultivaluedHashMap<>();
        formData.forEach(data::put);
        data.putSingle("username", phone);
        data.putSingle(ATTR_PHONE, phone);
        return data;
    }

    private static UserModel findByAttribute(KeycloakSession session, RealmModel realm, String attr, String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return session.users()
                .searchForUserByUserAttributeStream(realm, attr, value.trim())
                .findFirst()
                .orElse(null);
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
