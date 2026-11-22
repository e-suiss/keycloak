package com.esuiss.keycloak.registration.validation;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class TcKimlikValidatorTest {

    private static String withChecksums(int[] first9) {
        int odd = first9[0] + first9[2] + first9[4] + first9[6] + first9[8];
        int even = first9[1] + first9[3] + first9[5] + first9[7];
        int d10 = Math.floorMod(odd * 7 - even, 10);
        int sum = 0;
        for (int d : first9) {
            sum += d;
        }
        int d11 = (sum + d10) % 10;

        StringBuilder sb = new StringBuilder();
        for (int d : first9) {
            sb.append(d);
        }
        return sb.append(d10).append(d11).toString();
    }

    static List<String> validNumbers() {
        Random random = new Random(20260905L);
        List<String> out = new ArrayList<>();
        for (int i = 0; i < 40; i++) {
            int[] first9 = new int[9];
            first9[0] = 1 + random.nextInt(9);
            for (int j = 1; j < 9; j++) {
                first9[j] = random.nextInt(10);
            }
            out.add(withChecksums(first9));
        }
        return out;
    }

    @ParameterizedTest
    @MethodSource("validNumbers")
    @DisplayName("number matching the algorithm is accepted")
    void acceptsAlgorithmicallyValid(String tc) {
        assertTrue(TcKimlikValidator.isValid(tc), tc);
    }

    @ParameterizedTest
    @MethodSource("validNumbers")
    @DisplayName("rejected when a single digit is corrupted")
    void rejectsSingleDigitCorruption(String tc) {
        for (int i = 0; i < tc.length(); i++) {
            char original = tc.charAt(i);
            char replacement = original == '9' ? '8' : (char) (original + 1);
            if (i == 0 && replacement == '0') {
                continue;
            }
            String corrupted = tc.substring(0, i) + replacement + tc.substring(i + 1);
            assertFalse(TcKimlikValidator.isValid(corrupted), corrupted);
        }
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {
        "",
        "1234567890",
        "123456789012",
        "01234567890",
        "1234567890a",
        "abcdefghijk",
        "  10000000146  ",
    })
    @DisplayName("malformed input is rejected")
    void rejectsMalformed(String tc) {
        assertFalse(TcKimlikValidator.isValid(tc));
    }

    @Test
    @DisplayName("cannot start with zero")
    void rejectsLeadingZero() {
        String valid = validNumbers().get(0);
        assertFalse(TcKimlikValidator.isValid("0" + valid.substring(1)));
    }

    @Test
    @DisplayName("repeated single digit fails unless the checksum matches")
    void rejectsRepeatedDigits() {
        assertFalse(TcKimlikValidator.isValid("11111111111"));
        assertFalse(TcKimlikValidator.isValid("99999999999"));
    }
}
