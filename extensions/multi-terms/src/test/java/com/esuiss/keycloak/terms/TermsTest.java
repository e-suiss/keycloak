package com.esuiss.keycloak.terms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.mockito.ArgumentCaptor;

class TermsTest {

    private static Map<String, String> cfg(String... kv) {
        Map<String, String> m = new HashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(kv[i], kv[i + 1]);
        }
        return m;
    }

    @Nested
    class ContentHash {

        @Test
        @DisplayName("same input yields the same fingerprint")
        void deterministic() {
            assertEquals(Terms.contentHash("Privacy Policy v1"), Terms.contentHash("Privacy Policy v1"));
        }

        @Test
        @DisplayName("16 hex characters")
        void sixteenHexChars() {
            assertTrue(Terms.contentHash("x").matches("[0-9a-f]{16}"));
        }

        @Test
        @DisplayName("single character change changes the fingerprint")
        void singleCharChangeChangesHash() {
            assertNotEquals(Terms.contentHash("Privacy Policy text."), Terms.contentHash("Privacy Policy text!"));
        }

        @Test
        @DisplayName("null and empty yield the same fingerprint")
        void nullEqualsEmpty() {
            assertEquals(Terms.contentHash(""), Terms.contentHash(null));
        }
    }

    @Nested
    class FromConfig {

        @Test
        @DisplayName("null config returns null")
        void nullConfig() {
            assertNull(Terms.fromConfig(null));
        }

        @Test
        @DisplayName("missing or blank key returns null")
        void missingKey() {
            assertNull(Terms.fromConfig(cfg("title", "x")));
            assertNull(Terms.fromConfig(cfg("key", "   ")));
        }

        @Test
        @DisplayName("mode=required is mandatory without a read requirement")
        void modeRequired() {
            Term t = Terms.fromConfig(cfg("key", "privacy", "mode", "required"));
            assertTrue(t.isRequired());
            assertFalse(t.isMustRead());
        }

        @Test
        @DisplayName("mode=required_read is mandatory and requires reading")
        void modeRequiredRead() {
            Term t = Terms.fromConfig(cfg("key", "privacy", "mode", "required_read"));
            assertTrue(t.isRequired());
            assertTrue(t.isMustRead());
        }

        @Test
        @DisplayName("mode=optional is not mandatory")
        void modeOptional() {
            Term t = Terms.fromConfig(cfg("key", "marketing", "mode", "optional"));
            assertFalse(t.isRequired());
            assertFalse(t.isMustRead());
        }

        @Test
        @DisplayName("legacy format: missing required defaults to mandatory")
        void legacyDefaultsToRequired() {
            Term t = Terms.fromConfig(cfg("key", "privacy"));
            assertTrue(t.isRequired());
            assertFalse(t.isMustRead());
        }

        @Test
        @DisplayName("legacy format: required=true and mustRead=true")
        void legacyRequiredMustRead() {
            Term t = Terms.fromConfig(cfg("key", "privacy", "required", "true", "mustRead", "true"));
            assertTrue(t.isRequired());
            assertTrue(t.isMustRead());
        }

        @Test
        @DisplayName("legacy format: an optional term cannot carry a read requirement")
        void legacyOptionalCannotBeMustRead() {
            Term t = Terms.fromConfig(cfg("key", "marketing", "required", "false", "mustRead", "true"));
            assertFalse(t.isRequired());
            assertFalse(t.isMustRead());
        }

        @Test
        @DisplayName("blank mode falls back to the legacy format")
        void blankModeFallsBackToLegacy() {
            Term t = Terms.fromConfig(cfg("key", "x", "mode", " ", "required", "false"));
            assertFalse(t.isRequired());
        }

        @Test
        @DisplayName("title defaults to key, content defaults to empty")
        void defaults() {
            Term t = Terms.fromConfig(cfg("key", "privacy"));
            assertEquals("privacy", t.getTitle());
            assertEquals("", t.getContent());
        }

        @Test
        @DisplayName("key is trimmed")
        void keyIsTrimmed() {
            assertEquals("privacy", Terms.fromConfig(cfg("key", "  privacy  ")).getKey());
        }

        @Test
        @DisplayName("version is derived from title and content with a NUL separator")
        void versionDerivedFromTitleAndContent() {
            Term t = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "text"));
            assertEquals(Terms.contentHash("Privacy Policy\u0000text"), t.getVersion());
        }

        @Test
        @DisplayName("shifting the title/content boundary changes the version")
        void boundaryShiftChangesVersion() {
            Term a = Terms.fromConfig(cfg("key", "k", "title", "AB", "content", "C"));
            Term b = Terms.fromConfig(cfg("key", "k", "title", "A", "content", "BC"));
            assertNotEquals(a.getVersion(), b.getVersion());
        }

        @Test
        @DisplayName("content change bumps the version, key stays the same")
        void contentChangeBumpsVersion() {
            Term v1 = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "old"));
            Term v2 = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "new"));
            assertEquals(v1.getKey(), v2.getKey());
            assertNotEquals(v1.getVersion(), v2.getVersion());
        }

        @Test
        @DisplayName("title-only change also bumps the version")
        void titleChangeBumpsVersion() {
            Term v1 = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "m"));
            Term v2 = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy 2026", "content", "m"));
            assertNotEquals(v1.getVersion(), v2.getVersion());
        }

        @Test
        @DisplayName("mode and required changes do not affect the version")
        void modeDoesNotAffectVersion() {
            Term a = Terms.fromConfig(cfg("key", "k", "title", "T", "content", "C", "mode", "required"));
            Term b = Terms.fromConfig(cfg("key", "k", "title", "T", "content", "C", "mode", "optional"));
            assertEquals(a.getVersion(), b.getVersion());
        }
    }

    @Nested
    class Pending {

        private final Term privacy = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "v1"));
        private final Term marketing = Terms.fromConfig(cfg("key", "mkt", "mode", "optional", "content", "x"));

        private UserModel userAccepted(String key, String fingerprint) {
            UserModel u = mock(UserModel.class);
            lenient().when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + key)).thenReturn(fingerprint);
            return u;
        }

        @Test
        @DisplayName("never accepted term is pending")
        void neverAcceptedIsPending() {
            assertTrue(Terms.isPending(userAccepted("privacy", null), privacy));
        }

        @Test
        @DisplayName("blank acceptance value counts as pending")
        void blankAcceptedIsPending() {
            assertTrue(Terms.isPending(userAccepted("privacy", "  "), privacy));
        }

        @Test
        @DisplayName("current version accepted is not pending")
        void currentVersionAcceptedIsNotPending() {
            assertFalse(Terms.isPending(userAccepted("privacy", privacy.getVersion()), privacy));
        }

        @Test
        @DisplayName("old version acceptance requires re-consent on the new version")
        void oldVersionAcceptedIsPendingAgain() {
            Term v2 = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "v2"));
            assertTrue(Terms.isPending(userAccepted("privacy", privacy.getVersion()), v2));
        }

        @Test
        @DisplayName("acceptance value stored with whitespace still matches")
        void acceptedIsTrimmed() {
            assertFalse(Terms.isPending(userAccepted("privacy", " " + privacy.getVersion() + " "), privacy));
        }

        @Test
        @DisplayName("another key's acceptance does not satisfy this term")
        void otherKeyAcceptanceDoesNotCount() {
            UserModel u = mock(UserModel.class);
            lenient().when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + "mkt")).thenReturn(privacy.getVersion());
            lenient().when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + "privacy")).thenReturn(null);
            assertTrue(Terms.isPending(u, privacy));
        }

        @Test
        @DisplayName("requiredPending excludes optional terms")
        void requiredPendingExcludesOptional() {
            UserModel u = mock(UserModel.class);
            lenient().when(u.getFirstAttribute(anyString())).thenReturn(null);
            List<Term> pending = Terms.requiredPending(u, List.of(privacy, marketing));
            assertEquals(List.of(privacy), pending);
        }

        @Test
        @DisplayName("requiredPending excludes accepted mandatory terms")
        void requiredPendingExcludesAccepted() {
            assertTrue(Terms.requiredPending(userAccepted("privacy", privacy.getVersion()), List.of(privacy)).isEmpty());
        }

        @Test
        @DisplayName("requiredPending preserves order")
        void requiredPendingKeepsOrder() {
            Term a = Terms.fromConfig(cfg("key", "a", "content", "1"));
            Term b = Terms.fromConfig(cfg("key", "b", "content", "2"));
            UserModel u = mock(UserModel.class);
            lenient().when(u.getFirstAttribute(anyString())).thenReturn(null);
            assertEquals(List.of(b, a), Terms.requiredPending(u, List.of(b, a)));
        }
    }

    @Nested
    class RecordConsent {

        private final Term privacy = Terms.fromConfig(cfg("key", "privacy", "title", "Privacy Policy", "content", "v1"));

        @Test
        @DisplayName("nothing is written when the same version is already accepted")
        void sameFingerprintIsNoOp() {
            UserModel u = mock(UserModel.class);
            RealmModel r = mock(RealmModel.class);
            when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + "privacy")).thenReturn(privacy.getVersion());

            Terms.recordConsent(r, u, privacy);

            verify(u, never()).setSingleAttribute(anyString(), anyString());
            verify(u, never()).setAttribute(anyString(), anyList());
            verify(r, never()).setAttribute(anyString(), anyString());
        }

        @Test
        @DisplayName("new consent writes acceptance, history and archive")
        void newConsentWritesAcceptedHistoryAndArchive() {
            UserModel u = mock(UserModel.class);
            RealmModel r = mock(RealmModel.class);
            when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + "privacy")).thenReturn(null);
            when(u.getAttributeStream(Terms.ATTR_CONSENT + "privacy")).thenAnswer(inv -> Stream.<String>empty());
            when(r.getAttribute(anyString())).thenReturn(null);

            Terms.recordConsent(r, u, privacy);

            verify(u).setSingleAttribute(Terms.ATTR_ACCEPTED + "privacy", privacy.getVersion());

            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<String>> hist = ArgumentCaptor.forClass(List.class);
            verify(u).setAttribute(eq(Terms.ATTR_CONSENT + "privacy"), hist.capture());
            assertEquals(1, hist.getValue().size());
            assertTrue(hist.getValue().get(0).startsWith(privacy.getVersion() + "|"));
            assertTrue(hist.getValue().get(0).substring(privacy.getVersion().length() + 1).matches("[0-9]+"));

            ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
            verify(r).setAttribute(eq(Terms.archiveAttr("privacy", privacy.getVersion())), json.capture());
            assertTrue(json.getValue().contains("\"title\":\"Privacy Policy\""));
            assertTrue(json.getValue().contains("\"content\":\"v1\""));
        }

        @Test
        @DisplayName("history is appended, not overwritten")
        void historyIsAppended() {
            UserModel u = mock(UserModel.class);
            RealmModel r = mock(RealmModel.class);
            when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + "privacy")).thenReturn("oldfp");
            when(u.getAttributeStream(Terms.ATTR_CONSENT + "privacy")).thenAnswer(inv -> Stream.of("oldfp|1"));
            when(r.getAttribute(anyString())).thenReturn("{}");

            Terms.recordConsent(r, u, privacy);

            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<String>> hist = ArgumentCaptor.forClass(List.class);
            verify(u).setAttribute(eq(Terms.ATTR_CONSENT + "privacy"), hist.capture());
            assertEquals(2, hist.getValue().size());
            assertEquals("oldfp|1", hist.getValue().get(0));
            assertTrue(hist.getValue().get(1).startsWith(privacy.getVersion() + "|"));
        }

        @Test
        @DisplayName("archive is written once and never overwritten")
        void archiveIsWrittenOnce() {
            UserModel u = mock(UserModel.class);
            RealmModel r = mock(RealmModel.class);
            when(u.getFirstAttribute(Terms.ATTR_ACCEPTED + "privacy")).thenReturn(null);
            when(u.getAttributeStream(anyString())).thenAnswer(inv -> Stream.<String>empty());
            when(r.getAttribute(Terms.archiveAttr("privacy", privacy.getVersion()))).thenReturn("{\"title\":\"Privacy Policy\"}");

            Terms.recordConsent(r, u, privacy);

            verify(r, never()).setAttribute(anyString(), anyString());
        }

        @Test
        @DisplayName("null title falls back to key in the archive")
        void nullTitleArchivesAsKey() {
            Term t = new Term("k", null, "fp", true, false, null);
            UserModel u = mock(UserModel.class);
            RealmModel r = mock(RealmModel.class);
            when(u.getFirstAttribute(anyString())).thenReturn(null);
            when(u.getAttributeStream(anyString())).thenAnswer(inv -> Stream.<String>empty());
            when(r.getAttribute(anyString())).thenReturn(null);

            Terms.recordConsent(r, u, t);

            ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
            verify(r).setAttribute(eq(Terms.archiveAttr("k", "fp")), json.capture());
            assertTrue(json.getValue().contains("\"title\":\"k\""));
            assertTrue(json.getValue().contains("\"content\":\"\""));
        }
    }

    @Nested
    class Archive {

        @Test
        @DisplayName("archive name is built from key and fingerprint")
        void archiveAttrName() {
            assertEquals("terms.privacy.abc123", Terms.archiveAttr("privacy", "abc123"));
        }

        @Test
        @DisplayName("archived version is read back")
        void roundTrip() {
            RealmModel r = mock(RealmModel.class);
            when(r.getAttribute("terms.privacy.fp")).thenReturn("{\"title\":\"Privacy Policy\",\"content\":\"text\"}");
            Map<String, String> m = Terms.archivedVersion(r, "privacy", "fp");
            assertNotNull(m);
            assertEquals("Privacy Policy", m.get("title"));
            assertEquals("text", m.get("content"));
        }

        @Test
        @DisplayName("missing archive returns null")
        void missingIsNull() {
            RealmModel r = mock(RealmModel.class);
            when(r.getAttribute(anyString())).thenReturn(null);
            assertNull(Terms.archivedVersion(r, "privacy", "fp"));
        }

        @Test
        @DisplayName("malformed JSON returns null without throwing")
        void malformedIsNull() {
            RealmModel r = mock(RealmModel.class);
            when(r.getAttribute(anyString())).thenReturn("{broken");
            assertNull(Terms.archivedVersion(r, "privacy", "fp"));
        }
    }
}
