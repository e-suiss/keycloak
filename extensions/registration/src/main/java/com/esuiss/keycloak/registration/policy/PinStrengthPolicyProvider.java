package com.esuiss.keycloak.registration.policy;

import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.policy.PasswordPolicyProvider;
import org.keycloak.policy.PolicyError;

public class PinStrengthPolicyProvider implements PasswordPolicyProvider {

    @Override
    public PolicyError validate(RealmModel realm, UserModel user, String password) {
        return PinRules.isWeak(user, password) ? new PolicyError(PinRules.ERROR) : null;
    }

    @Override
    public PolicyError validate(String username, String password) {

        return PinRules.isWeakBasic(password) ? new PolicyError(PinRules.ERROR) : null;
    }

    @Override
    public Object parseConfig(String value) {
        return value;
    }

    @Override
    public void close() {

    }
}
