package com.esuiss.keycloak.login.otp;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

import org.jboss.logging.Logger;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.sessions.AuthenticationSessionModel;

public final class OtpCodes {

    public static final long TTL_MS = 3 * 60 * 1000L;
    public static final int MAX_ATTEMPTS = 3;

    private static final String NOTE_CODE = "phone-otp-code";
    private static final String NOTE_EXPIRES_AT = "phone-otp-expires-at";
    private static final String NOTE_ATTEMPTS = "phone-otp-attempts";

    private static final Logger LOG = Logger.getLogger(OtpCodes.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    public enum Result {

        VALID,

        INVALID,

        EXPIRED,

        CANCELLED_NEW_SENT;
    }

    private OtpCodes() {
    }

    public static void ensureCodeSent(AuthenticationFlowContext context, String phone) {
        AuthenticationSessionModel session = context.getAuthenticationSession();
        if (session.getAuthNote(NOTE_CODE) != null && !expired(session)) {
            return;
        }
        sendNewCode(context, phone);
    }

    public static void sendNewCode(AuthenticationFlowContext context, String phone) {
        AuthenticationSessionModel session = context.getAuthenticationSession();
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        session.setAuthNote(NOTE_CODE, code);
        session.setAuthNote(NOTE_EXPIRES_AT, Long.toString(System.currentTimeMillis() + TTL_MS));
        session.setAuthNote(NOTE_ATTEMPTS, "0");
        send(phone, code);
    }

    public static Result verify(AuthenticationFlowContext context, String submitted, String phone) {
        AuthenticationSessionModel session = context.getAuthenticationSession();
        String code = session.getAuthNote(NOTE_CODE);
        if (code == null || expired(session)) {
            sendNewCode(context, phone);
            return Result.EXPIRED;
        }
        if (submitted != null && MessageDigest.isEqual(
                code.getBytes(StandardCharsets.UTF_8), submitted.getBytes(StandardCharsets.UTF_8))) {
            clear(session);
            return Result.VALID;
        }
        int attempts = parseAttempts(session) + 1;
        if (attempts >= MAX_ATTEMPTS) {
            sendNewCode(context, phone);
            return Result.CANCELLED_NEW_SENT;
        }
        session.setAuthNote(NOTE_ATTEMPTS, Integer.toString(attempts));
        return Result.INVALID;
    }

    private static boolean expired(AuthenticationSessionModel session) {
        String raw = session.getAuthNote(NOTE_EXPIRES_AT);
        try {
            return raw == null || System.currentTimeMillis() > Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return true;
        }
    }

    private static int parseAttempts(AuthenticationSessionModel session) {
        try {
            return Integer.parseInt(session.getAuthNote(NOTE_ATTEMPTS));
        } catch (RuntimeException e) {
            return 0;
        }
    }

    private static void clear(AuthenticationSessionModel session) {
        session.removeAuthNote(NOTE_CODE);
        session.removeAuthNote(NOTE_EXPIRES_AT);
        session.removeAuthNote(NOTE_ATTEMPTS);
    }

    private static void send(String phone, String code) {

        LOG.infof("SMS stub [otp] to %s: your verification code is %s (valid for 3 minutes)", phone, code);
    }
}
