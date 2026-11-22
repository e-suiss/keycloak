package com.esuiss.keycloak.login;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class PhoneTest {

    @ParameterizedTest
    @CsvSource({
        "5321234567, 5321234567",
        "05321234567, 5321234567",
        "905321234567, 5321234567",
        "+90 532 123 45 67, 5321234567",
        "0532-123-45-67, 5321234567",
        "(0532) 123 45 67, 5321234567",
    })
    @DisplayName("country code and formatting are stripped")
    void normalizesToNationalFormat(String raw, String expected) {
        assertEquals(expected, Phone.normalize(raw));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {
        "",
        "532123456",
        "53212345678",
        "4321234567",
        "0432123456",
        "abcdefghij",
        "902123456789",
    })
    @DisplayName("invalid number returns null")
    void rejectsInvalid(String raw) {
        assertNull(Phone.normalize(raw));
    }

    @Test
    @DisplayName("landline is not treated as mobile")
    void rejectsLandline() {
        assertNull(Phone.normalize("02121234567"));
    }

    @Test
    @DisplayName("isValid accepts only the normalized format")
    void isValidChecksNationalFormat() {
        assertTrue(Phone.isValid("5321234567"));
        assertFalse(Phone.isValid("05321234567"));
        assertFalse(Phone.isValid(null));
    }
}
