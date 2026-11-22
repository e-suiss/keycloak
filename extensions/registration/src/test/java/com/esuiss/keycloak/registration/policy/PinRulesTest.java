package com.esuiss.keycloak.registration.policy;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.keycloak.models.UserModel;

class PinRulesTest {

    private static UserModel user(String tc, String birthDate, String phone) {
        UserModel user = mock(UserModel.class);
        lenient().when(user.getFirstAttribute("tc")).thenReturn(tc);
        lenient().when(user.getFirstAttribute("birthDate")).thenReturn(birthDate);
        lenient().when(user.getFirstAttribute("phoneNumber")).thenReturn(phone);
        return user;
    }

    @ParameterizedTest
    @ValueSource(strings = {"000000", "111111", "555555", "999999"})
    @DisplayName("repeated single digit is weak")
    void repeatedDigitsAreWeak(String pin) {
        assertTrue(PinRules.isWeakBasic(pin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"123456", "234567", "456789", "012345"})
    @DisplayName("ascending sequence is weak")
    void ascendingIsWeak(String pin) {
        assertTrue(PinRules.isWeakBasic(pin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"654321", "987654", "543210"})
    @DisplayName("descending sequence is weak")
    void descendingIsWeak(String pin) {
        assertTrue(PinRules.isWeakBasic(pin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"482913", "719304", "260851"})
    @DisplayName("random PIN passes the basic rules")
    void randomPinPassesBasicRules(String pin) {
        assertFalse(PinRules.isWeakBasic(pin));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "12345", "1234567", "12345a"})
    @DisplayName("input that is not a six-digit number is not flagged by the basic rules")
    void nonSixDigitIsNotFlaggedByBasicRules(String pin) {
        assertFalse(PinRules.isWeakBasic(pin));
    }

    @Test
    @DisplayName("birth date derivatives are weak")
    void birthDateDerivedIsWeak() {
        UserModel u = user(null, "1990-07-24", null);
        assertTrue(PinRules.isWeak(u, "240790"));
        assertTrue(PinRules.isWeak(u, "900724"));
        assertTrue(PinRules.isWeak(u, "072490"));
        assertFalse(PinRules.isWeak(u, "482913"));
    }

    @Test
    @DisplayName("Turkish ID number substring is weak")
    void tcSubstringIsWeak() {
        UserModel u = user("10000000146", null, null);
        assertTrue(PinRules.isWeak(u, "100000"));
        assertTrue(PinRules.isWeak(u, "000146"));
        assertFalse(PinRules.isWeak(u, "482913"));
    }

    @Test
    @DisplayName("phone number substring is weak")
    void phoneSubstringIsWeak() {
        UserModel u = user(null, null, "5321234567");
        assertTrue(PinRules.isWeak(u, "532123"));
        assertTrue(PinRules.isWeak(u, "234567"));
        assertFalse(PinRules.isWeak(u, "482913"));
    }

    @Test
    @DisplayName("without user data only the basic rules apply")
    void withoutUserOnlyBasicRulesApply() {
        assertTrue(PinRules.isWeak(null, "111111"));
        assertFalse(PinRules.isWeak(null, "482913"));
    }

    @Test
    @DisplayName("malformed birth date format does not crash")
    void malformedBirthDateIsIgnored() {
        UserModel u = user(null, "24.07.1990", null);
        assertFalse(PinRules.isWeak(u, "240790"));
    }
}
