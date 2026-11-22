package com.esuiss.keycloak.registration.action;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import org.keycloak.authentication.RequiredActionContext;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserCredentialModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.credential.PasswordCredentialModel;

import com.esuiss.keycloak.registration.policy.PinRules;
import com.esuiss.keycloak.registration.validation.TcKimlikValidator;
import com.esuiss.keycloak.terms.Term;
import com.esuiss.keycloak.terms.Terms;

public class CompleteRegistrationAction implements RequiredActionProvider {

    public static final String PROVIDER_ID = "complete-registration";
    public static final String ATTR_TC = "tc";
    public static final String ATTR_BIRTHDATE = "birthDate";
    public static final String ATTR_PHONE = "phoneNumber";
    public static final String ATTR_PHONE_VERIFIED = "phoneNumberVerified";

    public static final String OTP_TEST = "123456";

    private static final String NAME_PATTERN = "^[\\p{L} .'-]+$";
    private static final int MIN_AGE = 18;

    public enum Step {
        PHONE, PHONE_OTP, IDENTITY, EMAIL, EMAIL_OTP, PASSWORD, DONE
    }

    public static Step nextStep(KeycloakSession session, RealmModel realm, UserModel u) {
        if (isBlank(u.getFirstAttribute(ATTR_PHONE))) {
            return Step.PHONE;
        }
        if (!"true".equals(u.getFirstAttribute(ATTR_PHONE_VERIFIED))) {
            return Step.PHONE_OTP;
        }
        if (isBlank(u.getFirstName()) || isBlank(u.getLastName())
                || isBlank(u.getFirstAttribute(ATTR_TC))
                || isBlank(u.getFirstAttribute(ATTR_BIRTHDATE))) {
            return Step.IDENTITY;
        }
        if (isBlank(u.getEmail())) {
            return Step.EMAIL;
        }
        if (!u.isEmailVerified()) {
            return Step.EMAIL_OTP;
        }
        if (!isSocial(session, realm, u)
                && !u.credentialManager().isConfiguredFor(PasswordCredentialModel.TYPE)) {
            return Step.PASSWORD;
        }
        return Step.DONE;
    }

    private static boolean isSocial(KeycloakSession session, RealmModel realm, UserModel u) {
        return session.users().getFederatedIdentitiesStream(realm, u).findAny().isPresent();
    }

    @Override
    public void evaluateTriggers(RequiredActionContext context) {
        if (nextStep(context.getSession(), context.getRealm(), context.getUser()) != Step.DONE) {
            context.getUser().addRequiredAction(PROVIDER_ID);
        }
    }

    @Override
    public void requiredActionChallenge(RequiredActionContext context) {
        Step step = nextStep(context.getSession(), context.getRealm(), context.getUser());
        if (step == Step.DONE) {
            context.getUser().removeRequiredAction(PROVIDER_ID);
            context.success();
            return;
        }
        context.challenge(buildForm(context, step, null));
    }

    @Override
    public void processAction(RequiredActionContext context) {
        KeycloakSession session = context.getSession();
        RealmModel realm = context.getRealm();
        UserModel user = context.getUser();
        Step step = nextStep(session, realm, user);
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();

        if ((step == Step.PHONE_OTP || step == Step.EMAIL_OTP) && !isBlank(form.getFirst("back"))) {
            if (step == Step.PHONE_OTP) {
                user.setSingleAttribute(ATTR_PHONE, "");
                user.setSingleAttribute(ATTR_PHONE_VERIFIED, "false");
            } else {
                user.setEmail(null);
                user.setEmailVerified(false);
            }
            context.challenge(buildForm(context, nextStep(session, realm, user), null));
            return;
        }

        switch (step) {
            case PHONE:
                String phone = trim(form.getFirst("phoneNumber"));
                if (phone == null || !phone.matches("5[0-9]{9}")) {
                    context.challenge(buildForm(context, step, "invalidPhone"));
                    return;
                }
                user.setSingleAttribute(ATTR_PHONE, phone);
                user.setUsername(phone);
                break;

            case PHONE_OTP:
                if (!OTP_TEST.equals(trim(form.getFirst("otp")))) {
                    context.challenge(buildForm(context, step, "invalidOtp"));
                    return;
                }
                user.setSingleAttribute(ATTR_PHONE_VERIFIED, "true");
                break;

            case IDENTITY:
                String firstName = trim(form.getFirst("firstName"));
                String lastName = trim(form.getFirst("lastName"));
                String tc = trim(form.getFirst("tc"));
                String birthDate = trim(form.getFirst("birthDate"));
                List<Term> pending = pendingTerms(session, realm, user);
                String identityError = identityError(session, realm, user, firstName, lastName, tc, birthDate, pending, form);
                if (identityError != null) {
                    context.challenge(buildForm(context, step, identityError, form));
                    return;
                }
                user.setFirstName(firstName);
                user.setLastName(lastName);
                user.setSingleAttribute(ATTR_TC, tc);
                user.setSingleAttribute(ATTR_BIRTHDATE, birthDate);
                for (Term t : pending) {
                    if (form.getFirst(Terms.FIELD_PREFIX + t.getKey()) != null) {
                        Terms.recordConsent(realm, user, t);
                    }
                }
                break;

            case EMAIL:
                String email = trim(form.getFirst("email"));
                if (email == null || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                    context.challenge(buildForm(context, step, "invalidEmailFormat"));
                    return;
                }
                UserModel existing = session.users().getUserByEmail(realm, email);
                if (existing != null && !existing.getId().equals(user.getId())) {
                    context.challenge(buildForm(context, step, "emailExistsMessage"));
                    return;
                }
                user.setEmail(email);
                user.setEmailVerified(false);
                break;

            case EMAIL_OTP:
                if (!OTP_TEST.equals(trim(form.getFirst("otp")))) {
                    context.challenge(buildForm(context, step, "invalidOtp"));
                    return;
                }
                user.setEmailVerified(true);
                break;

            case PASSWORD:
                String pw = trim(form.getFirst("password"));
                String pc = trim(form.getFirst("password-confirm"));
                if (pw == null || !pw.matches("[0-9]{6}")) {
                    context.challenge(buildForm(context, step, "invalidPin"));
                    return;
                }
                if (PinRules.isWeak(user, pw)) {
                    context.challenge(buildForm(context, step, PinRules.ERROR));
                    return;
                }
                if (!pw.equals(pc)) {
                    context.challenge(buildForm(context, step, "pinMismatch"));
                    return;
                }
                user.credentialManager().updateCredential(UserCredentialModel.password(pw, false));
                break;

            default:
                break;
        }

        Step next = nextStep(session, realm, user);
        if (next == Step.DONE) {
            user.removeRequiredAction(PROVIDER_ID);
            context.success();
        } else {
            context.challenge(buildForm(context, next, null));
        }
    }

    private static String identityError(KeycloakSession session, RealmModel realm, UserModel user,
            String firstName, String lastName, String tc, String birthDate,
            List<Term> pending, MultivaluedMap<String, String> form) {
        if (!isValidName(firstName) || !isValidName(lastName)) {
            return "invalidName";
        }
        if (tc == null || !TcKimlikValidator.isValid(tc)) {
            return "invalidTc";
        }
        UserModel tcOwner = session.users()
                .searchForUserByUserAttributeStream(realm, ATTR_TC, tc)
                .filter(other -> !other.getId().equals(user.getId()))
                .findFirst().orElse(null);
        if (tcOwner != null) {
            return "tcExists";
        }
        String birthError = birthDateError(birthDate);
        if (birthError != null) {
            return birthError;
        }
        for (Term t : pending) {
            if (t.isRequired() && form.getFirst(Terms.FIELD_PREFIX + t.getKey()) == null) {
                return "termsRequiredError";
            }
        }
        return null;
    }

    private static List<Term> pendingTerms(KeycloakSession session, RealmModel realm, UserModel user) {
        return Terms.loadActive(session, realm).stream()
                .filter(t -> Terms.isPending(user, t))
                .toList();
    }

    private Response buildForm(RequiredActionContext context, Step step, String error) {
        return buildForm(context, step, error, null);
    }

    private Response buildForm(RequiredActionContext context, Step step, String error,
            MultivaluedMap<String, String> echo) {
        UserModel u = context.getUser();
        String phone = u.getFirstAttribute(ATTR_PHONE);
        if (phone == null) {
            phone = u.getUsername();
        }
        List<Term> terms = step == Step.IDENTITY
                ? pendingTerms(context.getSession(), context.getRealm(), u)
                : List.of();
        var form = context.form()
                .setAttribute("step", step.name())
                .setAttribute("firstName", value(echo, "firstName", u.getFirstName()))
                .setAttribute("lastName", value(echo, "lastName", u.getLastName()))
                .setAttribute("tc", value(echo, "tc", u.getFirstAttribute(ATTR_TC)))
                .setAttribute("birthDate", value(echo, "birthDate", u.getFirstAttribute(ATTR_BIRTHDATE)))
                .setAttribute("phoneNumber", phone == null ? "" : phone)
                .setAttribute("userEmail", u.getEmail() == null ? "" : u.getEmail())
                .setAttribute("terms", terms);
        if (error != null) {
            form.setError(error);
        }
        return form.createForm("complete-registration.ftl");
    }

    private static String value(MultivaluedMap<String, String> echo, String field, String stored) {
        String typed = echo == null ? null : trim(echo.getFirst(field));
        if (typed != null) {
            return typed;
        }
        return stored == null ? "" : stored;
    }

    private static boolean isValidName(String s) {
        return s != null && s.length() <= 255 && s.matches(NAME_PATTERN);
    }

    private static String birthDateError(String value) {
        if (isBlank(value)) {
            return "invalidBirthDate";
        }
        LocalDate dob;
        try {
            dob = LocalDate.parse(value.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            return "invalidBirthDate";
        }
        LocalDate today = LocalDate.now();
        if (dob.isAfter(today)) {
            return "invalidBirthDate";
        }
        if (Period.between(dob, today).getYears() < MIN_AGE) {
            return "ageTooYoung";
        }
        return null;
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    @Override
    public void close() {

    }
}
