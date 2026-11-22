package com.esuiss.keycloak.authz;

import java.util.HashSet;
import java.util.Set;
import java.util.TreeSet;

import org.keycloak.models.ClientModel;
import org.keycloak.models.GroupModel;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;

public final class PermissionResolver {

    public static final String ADMIN_API_CLIENT = "admin-api";

    private PermissionResolver() {
    }

    public static Set<String> resolve(RealmModel realm, UserModel user) {
        Set<RoleModel> effective = new HashSet<>();

        user.getRoleMappingsStream().forEach(effective::add);
        user.getGroupsStream().forEach(g -> addGroupRoles(g, effective));

        RoleModel defaultRole = realm.getDefaultRole();
        if (defaultRole != null) {
            effective.add(defaultRole);
        }

        Set<RoleModel> expanded = new HashSet<>();
        for (RoleModel r : effective) {
            expandComposite(r, expanded);
        }

        Set<String> perms = new TreeSet<>();
        for (RoleModel r : expanded) {
            if (r.isClientRole()
                    && r.getContainer() instanceof ClientModel client
                    && ADMIN_API_CLIENT.equals(client.getClientId())) {
                perms.add(r.getName());
            }
        }
        return perms;
    }

    private static void addGroupRoles(GroupModel group, Set<RoleModel> acc) {
        group.getRoleMappingsStream().forEach(acc::add);
        GroupModel parent = group.getParent();
        if (parent != null) {
            addGroupRoles(parent, acc);
        }
    }

    private static void expandComposite(RoleModel role, Set<RoleModel> acc) {
        if (!acc.add(role)) {
            return;
        }
        if (role.isComposite()) {
            role.getCompositesStream().forEach(c -> expandComposite(c, acc));
        }
    }
}
