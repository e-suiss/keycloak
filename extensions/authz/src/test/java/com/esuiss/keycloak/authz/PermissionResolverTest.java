package com.esuiss.keycloak.authz;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.keycloak.models.ClientModel;
import org.keycloak.models.GroupModel;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;

class PermissionResolverTest {

    private RealmModel realm;
    private UserModel user;
    private ClientModel adminApi;
    private ClientModel otherClient;

    @BeforeEach
    void setUp() {
        realm = mock(RealmModel.class);
        user = mock(UserModel.class);
        adminApi = mock(ClientModel.class);
        otherClient = mock(ClientModel.class);
        lenient().when(adminApi.getClientId()).thenReturn(PermissionResolver.ADMIN_API_CLIENT);
        lenient().when(otherClient.getClientId()).thenReturn("wallet-web");
        lenient().when(realm.getDefaultRole()).thenReturn(null);
        directRoles();
        groups();
    }

    private RoleModel role(String name, ClientModel container, RoleModel... composites) {
        RoleModel r = mock(RoleModel.class, name);
        lenient().when(r.getName()).thenReturn(name);
        lenient().when(r.isClientRole()).thenReturn(container != null);
        lenient().when(r.getContainer()).thenReturn(container != null ? container : realm);
        lenient().when(r.isComposite()).thenReturn(composites.length > 0);
        List<RoleModel> kids = new ArrayList<>(List.of(composites));
        lenient().when(r.getCompositesStream()).thenAnswer(inv -> kids.stream());
        return r;
    }

    private RoleModel adminRole(String name, RoleModel... composites) {
        return role(name, adminApi, composites);
    }

    private RoleModel realmRole(String name, RoleModel... composites) {
        return role(name, null, composites);
    }

    private void directRoles(RoleModel... roles) {
        List<RoleModel> list = List.of(roles);
        lenient().when(user.getRoleMappingsStream()).thenAnswer(inv -> list.stream());
    }

    private void groups(GroupModel... groups) {
        List<GroupModel> list = List.of(groups);
        lenient().when(user.getGroupsStream()).thenAnswer(inv -> list.stream());
    }

    private GroupModel group(GroupModel parent, RoleModel... roles) {
        GroupModel g = mock(GroupModel.class);
        List<RoleModel> list = List.of(roles);
        lenient().when(g.getRoleMappingsStream()).thenAnswer(inv -> list.stream());
        lenient().when(g.getParent()).thenReturn(parent);
        return g;
    }

    @Test
    @DisplayName("no roles yields an empty set")
    void noRolesYieldsEmpty() {
        assertTrue(PermissionResolver.resolve(realm, user).isEmpty());
    }

    @Test
    @DisplayName("admin-api client role is a permission directly")
    void directAdminApiRoleIsPermission() {
        directRoles(adminRole("users:read"));
        assertEquals(Set.of("users:read"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("realm role does not count as a permission")
    void realmRoleIsNotPermission() {
        directRoles(realmRole("user"));
        assertTrue(PermissionResolver.resolve(realm, user).isEmpty());
    }

    @Test
    @DisplayName("another client's role does not count as a permission")
    void otherClientRoleIsNotPermission() {
        directRoles(role("users:read", otherClient));
        assertTrue(PermissionResolver.resolve(realm, user).isEmpty());
    }

    @Test
    @DisplayName("group roles and the parent group chain are included")
    void groupAndParentGroupRolesAreIncluded() {
        GroupModel root = group(null, adminRole("wallets:freeze"));
        GroupModel dept = group(root, adminRole("users:read"));
        groups(dept);
        assertEquals(Set.of("users:read", "wallets:freeze"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("realm default role composites are expanded")
    void defaultRoleCompositesAreExpanded() {
        RoleModel defaultRole = realmRole("default-roles", adminRole("reports:read"));
        when(realm.getDefaultRole()).thenReturn(defaultRole);
        assertEquals(Set.of("reports:read"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("admin-api roles inside a composite realm role are expanded")
    void compositeRealmRoleExpandsToPermissions() {
        RoleModel ops = realmRole("ops", adminRole("users:read"), adminRole("withdrawals:approve"));
        directRoles(ops);
        assertEquals(Set.of("users:read", "withdrawals:approve"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("nested composites are expanded two levels deep")
    void nestedCompositesAreExpanded() {
        RoleModel inner = realmRole("inner", adminRole("wallets:freeze"));
        RoleModel outer = realmRole("outer", inner);
        directRoles(outer);
        assertEquals(Set.of("wallets:freeze"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("cyclic composites do not loop forever")
    void cyclicCompositesTerminate() {
        RoleModel a = mock(RoleModel.class, "a");
        RoleModel b = mock(RoleModel.class, "b");
        RoleModel perm = adminRole("users:read");
        for (RoleModel r : List.of(a, b)) {
            lenient().when(r.isClientRole()).thenReturn(false);
            lenient().when(r.getContainer()).thenReturn(realm);
            lenient().when(r.isComposite()).thenReturn(true);
        }
        lenient().when(a.getName()).thenReturn("a");
        lenient().when(b.getName()).thenReturn("b");
        lenient().when(a.getCompositesStream()).thenAnswer(inv -> Stream.of(b, perm));
        lenient().when(b.getCompositesStream()).thenAnswer(inv -> Stream.of(a));
        directRoles(a);
        assertEquals(Set.of("users:read"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("same permission via multiple paths counts once")
    void duplicatesCollapse() {
        RoleModel shared = adminRole("users:read");
        directRoles(shared, realmRole("ops", shared));
        groups(group(null, shared));
        assertEquals(Set.of("users:read"), PermissionResolver.resolve(realm, user));
    }

    @Test
    @DisplayName("result is alphabetical and deterministic")
    void resultIsSorted() {
        directRoles(adminRole("withdrawals:approve"), adminRole("users:read"), adminRole("reports:read"));
        assertEquals(List.of("reports:read", "users:read", "withdrawals:approve"),
                new ArrayList<>(PermissionResolver.resolve(realm, user)));
    }

    @Test
    @DisplayName("non-composite role is not asked for composites")
    void nonCompositeIsNotExpanded() {
        RoleModel leaf = adminRole("users:read");
        directRoles(leaf);
        PermissionResolver.resolve(realm, user);
        verify(leaf, never()).getCompositesStream();
    }
}
