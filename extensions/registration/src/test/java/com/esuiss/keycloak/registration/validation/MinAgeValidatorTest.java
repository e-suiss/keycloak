package com.esuiss.keycloak.registration.validation;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MinAgeValidatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 5);
    private static final int MIN = MinAgeValidator.DEFAULT_MIN;

    @Test
    @DisplayName("the day before the birthday is not yet 18")
    void dayBeforeBirthdayIsTooYoung() {
        assertFalse(MinAgeValidator.isOldEnough(LocalDate.of(2008, 9, 6), TODAY, MIN));
    }

    @Test
    @DisplayName("accepted on the 18th birthday")
    void exactlyOnBirthdayIsOldEnough() {
        assertTrue(MinAgeValidator.isOldEnough(LocalDate.of(2008, 9, 5), TODAY, MIN));
    }

    @Test
    @DisplayName("accepted the day after the birthday")
    void dayAfterBirthdayIsOldEnough() {
        assertTrue(MinAgeValidator.isOldEnough(LocalDate.of(2008, 9, 4), TODAY, MIN));
    }

    @Test
    @DisplayName("someone born on 29 February turns 18 on 1 March in a non-leap year")
    void leapDayBirthdayInNonLeapYear() {
        LocalDate leapBorn = LocalDate.of(2008, 2, 29);
        assertFalse(MinAgeValidator.isOldEnough(leapBorn, LocalDate.of(2026, 2, 28), MIN));
        assertTrue(MinAgeValidator.isOldEnough(leapBorn, LocalDate.of(2026, 3, 1), MIN));
    }

    @Test
    @DisplayName("future date is rejected")
    void futureDateRejected() {
        assertFalse(MinAgeValidator.isOldEnough(TODAY.plusDays(1), TODAY, MIN));
    }

    @Test
    @DisplayName("null safe")
    void nullSafe() {
        assertFalse(MinAgeValidator.isOldEnough(null, TODAY, MIN));
        assertFalse(MinAgeValidator.isOldEnough(TODAY, null, MIN));
    }
}
