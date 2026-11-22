package com.esuiss.keycloak.authz;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.services.managers.AppAuthManager;
import org.keycloak.services.managers.AuthenticationManager;
import org.keycloak.services.managers.AuthenticationManager.AuthResult;
import org.keycloak.util.JsonSerialization;

import java.util.LinkedHashMap;
import java.util.Map;

public class AuthzResource {

    private final KeycloakSession session;
    private final RealmModel realm;

    public AuthzResource(KeycloakSession session) {
        this.session = session;
        this.realm = session.getContext().getRealm();
    }

    @GET
    @Path("check")
    @Produces(MediaType.APPLICATION_JSON)
    public Response check(@QueryParam("permission") String permission) {
        AuthResult auth = authenticate();
        if (auth == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (permission == null || permission.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        String perm = permission.trim();
        boolean allow = PermissionResolver.resolve(realm, auth.getUser()).contains(perm);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sub", auth.getUser().getId());
        out.put("permission", perm);
        out.put("allow", allow);
        return json(out);
    }

    @GET
    @Path("permissions")
    @Produces(MediaType.APPLICATION_JSON)
    public Response permissions() {
        AuthResult auth = authenticate();
        if (auth == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sub", auth.getUser().getId());
        out.put("username", auth.getUser().getUsername());
        out.put("permissions", PermissionResolver.resolve(realm, auth.getUser()));
        return json(out);
    }

    private AuthResult authenticate() {
        AuthResult a = new AppAuthManager.BearerTokenAuthenticator(session).authenticate();
        return a != null ? a : new AuthenticationManager().authenticateIdentityCookie(session, realm);
    }

    private Response json(Object value) {
        try {
            return Response.ok(JsonSerialization.writeValueAsString(value)).build();
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }
}
