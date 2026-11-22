package com.esuiss.keycloak.terms;

import jakarta.ws.rs.core.MultivaluedMap;

import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormContext;
import org.keycloak.authentication.ValidationContext;
import org.keycloak.events.Errors;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.utils.FormMessage;

import java.util.ArrayList;
import java.util.List;

public class TermFormAction implements FormAction {

    public static final String CONFIG_KEY = "key";
    public static final String CONFIG_TITLE = "title";
    public static final String CONFIG_REQUIRED = "required";
    public static final String CONFIG_MUST_READ = "mustRead";
    public static final String CONFIG_MODE = "mode";
    public static final String CONFIG_CONTENT = "content";

    public static final String MODE_OPTIONAL = "optional";
    public static final String MODE_REQUIRED = "required";
    public static final String MODE_REQUIRED_READ = "required_read";

    private static final String FIELD_PREFIX = "term_";

    private static final String ACC_ATTR = "terms.accumulated";

    @Override
    @SuppressWarnings("unchecked")
    public void buildPage(FormContext context, LoginFormsProvider form) {
        Term term = readTerm(context.getAuthenticatorConfig());
        if (term == null) {
            return;
        }
        KeycloakSession session = context.getSession();
        List<Term> acc = (List<Term>) session.getAttribute(ACC_ATTR);
        if (acc == null) {
            acc = new ArrayList<>();
            session.setAttribute(ACC_ATTR, acc);
        }
        acc.add(term);
        form.setAttribute("terms", acc);
    }

    @Override
    public void validate(ValidationContext context) {
        Term term = readTerm(context.getAuthenticatorConfig());
        if (term == null) {
            context.success();
            return;
        }
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        if (term.isRequired() && formData.getFirst(FIELD_PREFIX + term.getKey()) == null) {
            List<FormMessage> errors = new ArrayList<>();
            errors.add(new FormMessage(FIELD_PREFIX + term.getKey(), "termsRequiredError"));
            context.error(Errors.INVALID_REGISTRATION);
            context.validationError(formData, errors);
            return;
        }
        context.success();
    }

    @Override
    public void success(FormContext context) {
        Term term = readTerm(context.getAuthenticatorConfig());
        UserModel user = context.getUser();
        if (term == null || user == null) {
            return;
        }
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        if (formData.getFirst(FIELD_PREFIX + term.getKey()) != null) {
            Terms.recordConsent(context.getRealm(), user, term);
        }
    }

    private Term readTerm(AuthenticatorConfigModel cfg) {

        return cfg == null ? null : Terms.fromConfig(cfg.getConfig());
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
