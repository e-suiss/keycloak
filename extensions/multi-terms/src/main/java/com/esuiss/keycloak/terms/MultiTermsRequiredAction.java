package com.esuiss.keycloak.terms;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import org.keycloak.authentication.RequiredActionContext;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.UserModel;

import java.util.List;

public class MultiTermsRequiredAction implements RequiredActionProvider {

    public static final String PROVIDER_ID = "terms-reconsent";

    @Override
    public void evaluateTriggers(RequiredActionContext context) {
        List<Term> terms = Terms.loadActive(context.getSession(), context.getRealm());
        if (!Terms.requiredPending(context.getUser(), terms).isEmpty()) {
            context.getUser().addRequiredAction(PROVIDER_ID);
        }
    }

    @Override
    public void requiredActionChallenge(RequiredActionContext context) {
        List<Term> pending = pending(context);
        if (pending.isEmpty()) {
            context.success();
            return;
        }
        context.challenge(form(context, pending, false));
    }

    @Override
    public void processAction(RequiredActionContext context) {
        List<Term> pending = pending(context);
        UserModel user = context.getUser();
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();

        for (Term t : pending) {
            if (t.isRequired() && form.getFirst(Terms.FIELD_PREFIX + t.getKey()) == null) {
                context.challenge(form(context, pending, true));
                return;
            }
        }

        for (Term t : pending) {
            if (form.getFirst(Terms.FIELD_PREFIX + t.getKey()) != null) {
                Terms.recordConsent(context.getRealm(), user, t);
            }
        }

        context.success();
    }

    private List<Term> pending(RequiredActionContext context) {
        List<Term> all = Terms.loadActive(context.getSession(), context.getRealm());
        UserModel user = context.getUser();
        return all.stream().filter(t -> Terms.isPending(user, t)).toList();
    }

    private Response form(RequiredActionContext context, List<Term> pending, boolean error) {
        var form = context.form().setAttribute("terms", pending);
        if (error) {
            form.setError("termsRequiredError");
        }
        return form.createForm("terms-reconsent.ftl");
    }

    @Override
    public void close() {

    }
}
