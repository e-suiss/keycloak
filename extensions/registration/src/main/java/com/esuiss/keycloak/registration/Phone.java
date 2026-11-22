package com.esuiss.keycloak.registration;

import java.util.regex.Pattern;

public final class Phone {

    public static final Pattern PATTERN = Pattern.compile("5[0-9]{9}");

    private static final Pattern NON_DIGIT = Pattern.compile("[^0-9]");

    private Phone() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = NON_DIGIT.matcher(raw).replaceAll("");
        if (digits.length() == 12 && digits.startsWith("90")) {
            digits = digits.substring(2);
        } else if (digits.length() == 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
        }
        return isValid(digits) ? digits : null;
    }

    public static boolean isValid(String digits) {
        return digits != null && PATTERN.matcher(digits).matches();
    }
}
