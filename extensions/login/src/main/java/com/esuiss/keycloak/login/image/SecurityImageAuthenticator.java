package com.esuiss.keycloak.login.image;

import java.util.ArrayList;
import java.util.List;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.Authenticator;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

public class SecurityImageAuthenticator implements Authenticator {

    public static final String ATTR_IMAGE = "securityImage";
    public static final String CONFIG_IMAGE_URLS = "imageUrls";

    private static final String MULTIVALUED_DELIMITER = "##";

    private static final String FIELD_IMAGE = "securityImage";
    private static final String FIELD_CONFIRM = "securityImageConfirm";

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        List<String> catalog = configuredImages(context);
        if (catalog.isEmpty()) {

            context.success();
            return;
        }
        UserModel user = context.getUser();
        String image = user == null ? null : user.getFirstAttribute(ATTR_IMAGE);
        context.challenge(buildForm(context, catalog, image, null));
    }

    @Override
    public void action(AuthenticationFlowContext context) {
        List<String> catalog = configuredImages(context);
        if (catalog.isEmpty()) {
            context.success();
            return;
        }
        UserModel user = context.getUser();
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();
        String existing = user == null ? null : user.getFirstAttribute(ATTR_IMAGE);

        if (isBlank(existing)) {

            String chosen = trim(form.getFirst(FIELD_IMAGE));
            if (chosen == null || !catalog.contains(chosen)) {
                context.challenge(buildForm(context, catalog, null, "securityImageRequired"));
                return;
            }
            user.setSingleAttribute(ATTR_IMAGE, chosen);
            context.success();
            return;
        }

        if ("yes".equals(trim(form.getFirst(FIELD_CONFIRM)))) {
            context.success();
        } else {
            context.resetFlow();
        }
    }

    private Response buildForm(AuthenticationFlowContext context, List<String> catalog, String image, String error) {
        LoginFormsProvider form = context.form();
        if (isBlank(image)) {
            form.setAttribute("mode", "SELECT");
            form.setAttribute("images", catalog);
        } else {
            form.setAttribute("mode", "CONFIRM");
            form.setAttribute("selectedImage", image);
        }
        if (error != null) {
            form.setError(error);
        }
        return form.createForm("security-image.ftl");
    }

    private static List<String> configuredImages(AuthenticationFlowContext context) {
        AuthenticatorConfigModel cfg = context.getAuthenticatorConfig();
        if (cfg == null || cfg.getConfig() == null) {
            return List.of();
        }
        String raw = cfg.getConfig().get(CONFIG_IMAGE_URLS);
        if (isBlank(raw)) {
            return List.of();
        }
        List<String> urls = new ArrayList<>();
        for (String part : raw.split(MULTIVALUED_DELIMITER)) {
            String url = trim(part);
            if (!isBlank(url) && !urls.contains(url)) {
                urls.add(url);
            }
        }
        return urls;
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
