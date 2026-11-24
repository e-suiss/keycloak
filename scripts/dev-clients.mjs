const BASE = process.env.KC_URL ?? "http://localhost:8080";
const REALMS = ["master", "suiss"];
const CLIENTS = ["account-console", "security-admin-console"];
const LOCAL_REDIRECTS = ["http://localhost*", "http://127.0.0.1*"];

async function api(token, path, init = {}) {
    const res = await fetch(`${BASE}/admin/realms${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers }
    });
    if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
    return res.status === 204 || res.status === 201 ? undefined : res.json();
}

const tokenRes = await fetch(`${BASE}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "password", client_id: "admin-cli", username: "admin", password: "admin" })
});
const { access_token: token } = await tokenRes.json();

for (const realm of REALMS) {
    for (const clientId of CLIENTS) {
        const [client] = await api(token, `/${realm}/clients?clientId=${clientId}`);
        if (!client) continue;
        client.redirectUris = [...new Set([...(client.redirectUris ?? []), ...LOCAL_REDIRECTS])];
        client.webOrigins = ["*"];
        client.attributes = { ...client.attributes, "post.logout.redirect.uris": "+" };
        await api(token, `/${realm}/clients/${client.id}`, { method: "PUT", body: JSON.stringify(client) });

        if (clientId !== "security-admin-console") continue;
        const mappers = await api(token, `/${realm}/clients/${client.id}/protocol-mappers/models`);
        if (mappers.some(m => m.config?.["claim.name"] === "allowed-origins")) continue;
        await api(token, `/${realm}/clients/${client.id}/protocol-mappers/models`, {
            method: "POST",
            body: JSON.stringify({
                name: "dev-allowed-origins",
                protocol: "openid-connect",
                protocolMapper: "oidc-hardcoded-claim-mapper",
                config: {
                    "claim.name": "allowed-origins",
                    "claim.value": '["*"]',
                    "jsonType.label": "JSON",
                    "access.token.claim": "true",
                    "id.token.claim": "false",
                    "userinfo.token.claim": "true",
                    "introspection.token.claim": "true",
                    "lightweight.claim": "true"
                }
            })
        });
    }
}
console.log("dev: console clients allow the Vite dev server");
