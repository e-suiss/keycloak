package com.esuiss.keycloak.terms;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.utils.RoleUtils;
import org.keycloak.services.managers.AppAuthManager;
import org.keycloak.services.managers.AuthenticationManager;
import org.keycloak.services.managers.AuthenticationManager.AuthResult;
import org.keycloak.util.JsonSerialization;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class ConsentsResource {

    private final KeycloakSession session;
    private final RealmModel realm;
    private static final DateTimeFormatter DF =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm").withLocale(new Locale("tr"));

    public ConsentsResource(KeycloakSession session) {
        this.session = session;
        this.realm = session.getContext().getRealm();
    }

    @GET
    @Path("me")
    @Produces(MediaType.APPLICATION_JSON)
    public Response me() {
        AuthResult auth = authenticate();
        if (auth == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        return json(auth.getUser());
    }

    @GET
    @Path("user/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response forUser(@PathParam("id") String id) {
        AuthResult auth = authenticate();
        if (auth == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!isAdmin(auth.getUser())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        UserModel user = session.users().getUserById(realm, id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return json(user);
    }

    private Response json(UserModel user) {
        Map<String, Term> active = new java.util.HashMap<>();
        for (Term t : Terms.loadActive(session, realm)) {
            active.put(t.getKey(), t);
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map.Entry<String, List<String>> e : user.getAttributes().entrySet()) {
            if (!e.getKey().startsWith(Terms.ATTR_CONSENT)) {
                continue;
            }
            String key = e.getKey().substring(Terms.ATTR_CONSENT.length());
            Term cur = active.get(key);
            String curFp = cur != null ? cur.getVersion() : null;

            List<String> entries = new ArrayList<>(e.getValue());
            entries.sort((a, b) -> Long.compare(epoch(b), epoch(a)));
            for (String entry : entries) {
                String fp = entry.contains("|") ? entry.substring(0, entry.indexOf('|')) : entry;
                long ts = epoch(entry);
                Map<String, String> snap = Terms.archivedVersion(realm, key, fp);

                Map<String, Object> rec = new LinkedHashMap<>();
                rec.put("key", key);
                rec.put("title", snap != null ? snap.get("title") : (cur != null ? cur.getTitle() : key));
                rec.put("fingerprint", fp);
                rec.put("acceptedAtEpoch", ts);
                rec.put("acceptedAt", ts > 0
                        ? DF.format(Instant.ofEpochSecond(ts).atZone(ZoneId.of("Europe/Istanbul")))
                        : null);
                rec.put("current", fp.equals(curFp));
                rec.put("content", snap != null ? snap.get("content") : null);
                items.add(rec);
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("username", user.getUsername());
        out.put("email", user.getEmail());
        out.put("items", items);
        try {
            return Response.ok(JsonSerialization.writeValueAsString(out)).build();
        } catch (Exception ex) {
            return Response.serverError().build();
        }
    }

    private AuthResult authenticate() {
        AuthResult a = new AppAuthManager.BearerTokenAuthenticator(session).authenticate();
        return a != null ? a : new AuthenticationManager().authenticateIdentityCookie(session, realm);
    }

    private boolean isAdmin(UserModel user) {
        RoleModel admin = realm.getRole("admin");
        return admin != null && RoleUtils.hasRole(user.getRoleMappingsStream(), admin);
    }

    private static long epoch(String entry) {
        try {
            int i = entry.indexOf('|');
            return i < 0 ? 0 : Long.parseLong(entry.substring(i + 1).trim());
        } catch (Exception e) {
            return 0;
        }
    }
}
