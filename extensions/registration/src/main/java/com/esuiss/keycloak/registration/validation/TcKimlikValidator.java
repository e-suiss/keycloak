package com.esuiss.keycloak.registration.validation;

import org.keycloak.validate.AbstractStringValidator;
import org.keycloak.validate.ValidationContext;
import org.keycloak.validate.ValidationError;
import org.keycloak.validate.ValidatorConfig;

public class TcKimlikValidator extends AbstractStringValidator {

    public static final String ID = "tc-kimlik";
    public static final String MESSAGE_INVALID = "invalidTc";

    @Override
    public String getId() {
        return ID;
    }

    @Override
    protected void doValidate(String value, String inputHint, ValidationContext context,
                              ValidatorConfig config) {
        if (!isValid(value.trim())) {
            context.addError(new ValidationError(ID, inputHint, MESSAGE_INVALID));
        }
    }

    public static boolean isValid(String tc) {
        if (tc == null || !tc.matches("[1-9][0-9]{10}")) {
            return false;
        }
        int[] d = new int[11];
        for (int i = 0; i < 11; i++) {
            d[i] = tc.charAt(i) - '0';
        }
        int oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
        int evenSum = d[1] + d[3] + d[5] + d[7];
        int check10 = ((oddSum * 7) - evenSum) % 10;
        if (check10 < 0) {
            check10 += 10;
        }
        if (check10 != d[9]) {
            return false;
        }
        int firstTenSum = 0;
        for (int i = 0; i < 10; i++) {
            firstTenSum += d[i];
        }
        return (firstTenSum % 10) == d[10];
    }
}
