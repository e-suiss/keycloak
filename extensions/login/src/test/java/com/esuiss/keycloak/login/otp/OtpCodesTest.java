package com.esuiss.keycloak.login.otp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.sessions.AuthenticationSessionModel;

class OtpCodesTest {

    private static final String PHONE = "5321234567";
    private static final String NOTE_CODE = "phone-otp-code";
    private static final String NOTE_EXPIRES_AT = "phone-otp-expires-at";
    private static final String NOTE_ATTEMPTS = "phone-otp-attempts";

    private Map<String, String> notes;
    private AuthenticationFlowContext context;

    @BeforeEach
    void setUp() {
        notes = new HashMap<>();

        AuthenticationSessionModel session = mock(AuthenticationSessionModel.class);
        when(session.getAuthNote(org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(inv -> notes.get(inv.getArgument(0, String.class)));
        org.mockito.Mockito.doAnswer(inv -> {
            notes.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(session).setAuthNote(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
        org.mockito.Mockito.doAnswer(inv -> {
            notes.remove(inv.getArgument(0, String.class));
            return null;
        }).when(session).removeAuthNote(org.mockito.ArgumentMatchers.anyString());

        context = mock(AuthenticationFlowContext.class);
        when(context.getAuthenticationSession()).thenReturn(session);
    }

    private String currentCode() {
        return notes.get(NOTE_CODE);
    }

    private void expireCode() {
        notes.put(NOTE_EXPIRES_AT, Long.toString(System.currentTimeMillis() - 1));
    }

    @Test
    @DisplayName("generated code has six digits")
    void generatedCodeIsSixDigits() {
        OtpCodes.sendNewCode(context, PHONE);
        assertNotNull(currentCode());
        assertTrue(currentCode().matches("[0-9]{6}"), currentCode());
    }

    @Test
    @DisplayName("validity period is three minutes")
    void ttlIsThreeMinutes() {
        assertEquals(3 * 60 * 1000L, OtpCodes.TTL_MS);
        long before = System.currentTimeMillis();
        OtpCodes.sendNewCode(context, PHONE);
        long expiresAt = Long.parseLong(notes.get(NOTE_EXPIRES_AT));
        assertTrue(expiresAt >= before + OtpCodes.TTL_MS);
    }

    @Test
    @DisplayName("correct code is accepted and cleared from the session")
    void correctCodeIsAcceptedAndCleared() {
        OtpCodes.sendNewCode(context, PHONE);
        assertEquals(OtpCodes.Result.VALID, OtpCodes.verify(context, currentCode(), PHONE));
        assertTrue(notes.isEmpty(), notes.toString());
    }

    @Test
    @DisplayName("wrong code increments the attempt counter")
    void wrongCodeIncrementsAttempts() {
        OtpCodes.sendNewCode(context, PHONE);
        assertEquals(OtpCodes.Result.INVALID, OtpCodes.verify(context, "000000", PHONE));
        assertEquals("1", notes.get(NOTE_ATTEMPTS));
    }

    @Test
    @DisplayName("third wrong attempt cancels the code and sends a new one")
    void thirdWrongAttemptCancelsAndResends() {
        OtpCodes.sendNewCode(context, PHONE);
        String first = currentCode();

        assertEquals(OtpCodes.Result.INVALID, OtpCodes.verify(context, "000000", PHONE));
        assertEquals(OtpCodes.Result.INVALID, OtpCodes.verify(context, "000000", PHONE));
        assertEquals(OtpCodes.Result.CANCELLED_NEW_SENT, OtpCodes.verify(context, "000000", PHONE));

        assertEquals("0", notes.get(NOTE_ATTEMPTS));
        assertNotNull(currentCode());
        assertNotEquals(first, currentCode());
        assertEquals(OtpCodes.Result.VALID, OtpCodes.verify(context, currentCode(), PHONE));
    }

    @Test
    @DisplayName("expired code is rejected and a new one is sent")
    void expiredCodeIsRejectedAndResent() {
        OtpCodes.sendNewCode(context, PHONE);
        String first = currentCode();
        expireCode();

        assertEquals(OtpCodes.Result.EXPIRED, OtpCodes.verify(context, first, PHONE));
        assertNotNull(currentCode());
        assertNotEquals(first, currentCode());
    }

    @Test
    @DisplayName("cancelled code no longer works")
    void cancelledCodeCannotBeReused() {
        OtpCodes.sendNewCode(context, PHONE);
        String first = currentCode();
        for (int i = 0; i < OtpCodes.MAX_ATTEMPTS; i++) {
            OtpCodes.verify(context, "000000", PHONE);
        }
        assertEquals(OtpCodes.Result.INVALID, OtpCodes.verify(context, first, PHONE));
    }

    @Test
    @DisplayName("ensureCodeSent keeps a live code, otherwise generates one")
    void ensureCodeSentKeepsLiveCode() {
        OtpCodes.ensureCodeSent(context, PHONE);
        String first = currentCode();
        OtpCodes.ensureCodeSent(context, PHONE);
        assertEquals(first, currentCode());

        expireCode();
        OtpCodes.ensureCodeSent(context, PHONE);
        assertNotEquals(first, currentCode());
    }

    @Test
    @DisplayName("verification without a code counts as expired")
    void verifyWithoutCodeIsExpired() {
        assertEquals(OtpCodes.Result.EXPIRED, OtpCodes.verify(context, "123456", PHONE));
        assertNotNull(currentCode());
    }

    @Test
    @DisplayName("null submission counts as invalid")
    void nullSubmissionIsInvalid() {
        OtpCodes.sendNewCode(context, PHONE);
        assertEquals(OtpCodes.Result.INVALID, OtpCodes.verify(context, null, PHONE));
    }
}
