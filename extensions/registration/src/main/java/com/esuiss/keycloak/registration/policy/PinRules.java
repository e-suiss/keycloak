package com.esuiss.keycloak.registration.policy;

import org.keycloak.models.UserModel;

public final class PinRules {

    public static final String ERROR = "crPinWeak";

    private static final String ATTR_PHONE = "phoneNumber";
    private static final String ATTR_TC = "tc";
    private static final String ATTR_BIRTHDATE = "birthDate";

    private PinRules() {
    }

    public static boolean isWeakBasic(String pin) {
        if (pin == null || !pin.matches("[0-9]{6}")) {
            return false;
        }
        if (pin.chars().distinct().count() == 1) {
            return true;
        }
        boolean asc = true, desc = true;
        for (int i = 1; i < pin.length(); i++) {
            int delta = pin.charAt(i) - pin.charAt(i - 1);
            if (delta != 1) asc = false;
            if (delta != -1) desc = false;
        }
        return asc || desc;
    }

    public static boolean isWeak(UserModel user, String pin) {
        if (isWeakBasic(pin)) {
            return true;
        }
        if (pin == null || !pin.matches("[0-9]{6}") || user == null) {
            return false;
        }
        String bd = user.getFirstAttribute(ATTR_BIRTHDATE);
        if (bd != null && bd.matches("\\d{4}-\\d{2}-\\d{2}")) {
            String yy = bd.substring(2, 4), mo = bd.substring(5, 7), da = bd.substring(8, 10);
            if (pin.equals(da + mo + yy) || pin.equals(yy + mo + da) || pin.equals(mo + da + yy)) {
                return true;
            }
        }
        String tc = user.getFirstAttribute(ATTR_TC);
        if (tc != null && tc.contains(pin)) {
            return true;
        }
        String phone = user.getFirstAttribute(ATTR_PHONE);
        return phone != null && phone.contains(pin);
    }
}
