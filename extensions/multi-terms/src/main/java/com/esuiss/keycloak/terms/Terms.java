package com.esuiss.keycloak.terms;

import org.keycloak.common.util.Time;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.AuthenticationFlowModel;
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.util.JsonSerialization;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Terms {

    public static final String AUTHENTICATOR_ID = "term-registration";
    public static final String ATTR_ACCEPTED = "terms.accepted.";
    public static final String ATTR_CONSENT = "terms.consent.";
    public static final String FIELD_PREFIX = "term_";
    private static final String ARCHIVE_PREFIX = "terms.";

    public static String archiveAttr(String key, String fingerprint) {
        return ARCHIVE_PREFIX + key + "." + fingerprint;
    }

    private Terms() {
    }

    public static Term fromConfig(Map<String, String> c) {
        if (c == null) {
            return null;
        }
        String key = c.get(TermFormAction.CONFIG_KEY);
        if (key == null || key.isBlank()) {
            return null;
        }

        boolean req;
        boolean mustRead;
        String mode = c.get(TermFormAction.CONFIG_MODE);
        if (mode != null && !mode.isBlank()) {
            req = !TermFormAction.MODE_OPTIONAL.equals(mode);
            mustRead = TermFormAction.MODE_REQUIRED_READ.equals(mode);
        } else {
            String required = c.get(TermFormAction.CONFIG_REQUIRED);
            req = required == null || Boolean.parseBoolean(required);
            mustRead = req && Boolean.parseBoolean(c.get(TermFormAction.CONFIG_MUST_READ));
        }
        String title = c.getOrDefault(TermFormAction.CONFIG_TITLE, key);
        String content = c.getOrDefault(TermFormAction.CONFIG_CONTENT, "");
        Term t = new Term(key.trim(), title, "", req, mustRead, content);

        t.version = contentHash(title + "\u0000" + content);
        return t;
    }

    public static String contentHash(String content) {
        String c = content == null ? "" : content;
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(c.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                sb.append(String.format("%02x", h[i]));
            }
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(c.hashCode());
        }
    }

    public static List<Term> loadActive(KeycloakSession session, RealmModel realm) {
        List<Term> out = new ArrayList<>();
        for (AuthenticationFlowModel flow : realm.getAuthenticationFlowsStream().toList()) {
            realm.getAuthenticationExecutionsStream(flow.getId()).forEach(exec -> {
                if (!AUTHENTICATOR_ID.equals(exec.getAuthenticator())) {
                    return;
                }
                if (exec.getRequirement() == AuthenticationExecutionModel.Requirement.DISABLED) {
                    return;
                }
                if (exec.getAuthenticatorConfig() == null) {
                    return;
                }
                AuthenticatorConfigModel cfg = realm.getAuthenticatorConfigById(exec.getAuthenticatorConfig());
                if (cfg == null) {
                    return;
                }
                Term t = fromConfig(cfg.getConfig());
                if (t != null) {
                    out.add(t);
                }
            });
        }
        return out;
    }

    public static String acceptedFingerprint(UserModel user, String key) {
        String v = user.getFirstAttribute(ATTR_ACCEPTED + key);
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    public static boolean isPending(UserModel user, Term t) {
        String accepted = acceptedFingerprint(user, t.getKey());
        return accepted == null || !accepted.equals(t.getVersion());
    }

    public static List<Term> requiredPending(UserModel user, List<Term> terms) {
        List<Term> p = new ArrayList<>();
        for (Term t : terms) {
            if (t.isRequired() && isPending(user, t)) {
                p.add(t);
            }
        }
        return p;
    }

    public static void recordConsent(RealmModel realm, UserModel user, Term t) {
        String fp = t.getVersion();

        if (fp.equals(acceptedFingerprint(user, t.getKey()))) {
            return;
        }
        user.setSingleAttribute(ATTR_ACCEPTED + t.getKey(), fp);
        List<String> history = new ArrayList<>(user.getAttributeStream(ATTR_CONSENT + t.getKey()).toList());
        history.add(fp + "|" + Time.currentTime());
        user.setAttribute(ATTR_CONSENT + t.getKey(), history);

        String name = archiveAttr(t.getKey(), fp);
        if (realm.getAttribute(name) == null) {
            Map<String, String> snap = new LinkedHashMap<>();
            snap.put("title", t.getTitle() == null ? t.getKey() : t.getTitle());
            snap.put("content", t.getContent() == null ? "" : t.getContent());
            try {
                realm.setAttribute(name, JsonSerialization.writeValueAsString(snap));
            } catch (Exception ignored) {

            }
        }
    }

    public static Map<String, String> archivedVersion(RealmModel realm, String key, String fingerprint) {
        String json = realm.getAttribute(archiveAttr(key, fingerprint));
        if (json == null) {
            return null;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> m = JsonSerialization.readValue(json, Map.class);
            return m;
        } catch (Exception e) {
            return null;
        }
    }
}
