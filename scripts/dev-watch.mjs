import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { sep } from "node:path";

const DEBOUNCE_MS = 400;
const HMR_DIRS = [`admin${sep}`, `account${sep}`];
let timer = null;
let building = false;
let pending = false;

const vite = spawn("npx", ["vite", "dev", "--port", "5173", "--strictPort"], {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, KEYCLOAKIFY_READ_KC_CONTEXT_FROM_URL: "true" }
});
vite.on("exit", code => process.exit(code ?? 1));

function build() {
    if (building) {
        pending = true;
        return;
    }
    building = true;
    const startedAt = Date.now();
    process.stdout.write("\n[dev] rebuilding login theme…\n");
    const child = spawn("make", ["-s", "dev-theme"], { stdio: "inherit" });
    child.on("exit", code => {
        building = false;
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        process.stdout.write(
            code === 0 ? `[dev] login ready in ${seconds}s — refresh the browser\n` : `[dev] login build failed (exit ${code})\n`
        );
        if (pending) {
            pending = false;
            build();
        }
    });
}

function coveredByHmr(file) {
    if (file.endsWith(".properties")) return false;
    return HMR_DIRS.some(dir => file.startsWith(dir));
}

watch("src", { recursive: true }, (_event, file) => {
    if (!file || file.endsWith("~") || file.includes(".DS_Store") || coveredByHmr(file)) return;
    clearTimeout(timer);
    timer = setTimeout(build, DEBOUNCE_MS);
});

function stop() {
    vite.kill();
    process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

process.stdout.write(
    [
        "",
        "[dev] admin   → http://localhost:8080/admin/master/console/   (admin / admin, hot reload)",
        "[dev] account → http://localhost:8080/realms/suiss/account/     (hot reload)",
        "[dev] login   → rebuilt on save, refresh to see changes",
        ""
    ].join("\n")
);
