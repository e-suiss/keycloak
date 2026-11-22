package com.esuiss.keycloak.login.form;

import jakarta.ws.rs.core.MultivaluedMap;

import org.jboss.logging.Logger;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.authenticators.browser.PasswordForm;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserLoginFailureModel;
import org.keycloak.models.UserModel;

public class PhonePasswordForm extends PasswordForm {

    public static final String ATTR_PHONE = "phoneNumber";

    private static final Logger LOG = Logger.getLogger(PhonePasswordForm.class);

    public PhonePasswordForm(KeycloakSession session) {
        super(session);
    }

    @Override
    public boolean validatePassword(AuthenticationFlowContext context, UserModel user,
            MultivaluedMap<String, String> inputData, boolean clearUser) {
        boolean valid = super.validatePassword(context, user, inputData, clearUser);
        if (!valid && user != null) {
            notifyIfJustLocked(context, user);
        }
        return valid;
    }

    private void notifyIfJustLocked(AuthenticationFlowContext context, UserModel user) {
        RealmModel realm = context.getRealm();
        if (!realm.isBruteForceProtected()) {
            return;
        }
        UserLoginFailureModel failures = context.getSession().loginFailures()
                .getUserLoginFailure(realm, user.getId());
        int previous = failures == null ? 0 : failures.getNumFailures();
        if (previous + 1 == realm.getFailureFactor()) {
            String phone = user.getFirstAttribute(ATTR_PHONE);

            LOG.infof("SMS stub [account-locked] to %s (user %s): your account has been temporarily "
                    + "locked after repeated wrong PIN attempts. Use the \"forgot my PIN\" step "
                    + "to unlock it.", phone, user.getUsername());
        }
    }

}
