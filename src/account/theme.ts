// Appearance manager for the account console.
// Mirrors web/admin: Light / Dark / System, toggled with the `d` hotkey,
// persisted to localStorage, applied via the shared `.dark` class.
import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "wallet-account-theme";

let allowDark = true;
let mode: ThemeMode = "system";
const listeners = new Set<() => void>();

function mql() {
    return window.matchMedia("(prefers-color-scheme: dark)");
}

function systemDark() {
    return mql().matches;
}

export function resolvedTheme(): "light" | "dark" {
    if (!allowDark) return "light";
    if (mode === "system") return systemDark() ? "dark" : "light";
    return mode;
}

function apply() {
    const dark = resolvedTheme() === "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
}

function emit() {
    apply();
    listeners.forEach(l => l());
}

function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
    );
}

function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.repeat) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() !== "d") return;
    if (isTypingTarget(event.target)) return;
    if (!allowDark) return;
    toggleTheme();
}

/** Called once at startup (from colorScheme.ts). */
export function initTheme(opts: { allowDark: boolean }) {
    allowDark = opts.allowDark;

    const stored =
        typeof localStorage !== "undefined"
            ? (localStorage.getItem(KEY) as ThemeMode | null)
            : null;
    mode = allowDark ? (stored ?? "system") : "light";

    apply();

    mql().addEventListener("change", () => {
        if (mode === "system") emit();
    });
    window.addEventListener("keydown", onKeyDown);
}

export function getThemeMode() {
    return mode;
}

export function setThemeMode(next: ThemeMode) {
    mode = allowDark ? next : "light";
    try {
        localStorage.setItem(KEY, mode);
    } catch {
        /* ignore */
    }
    emit();
}

export function toggleTheme() {
    setThemeMode(resolvedTheme() === "dark" ? "light" : "dark");
}

export function isDarkAllowed() {
    return allowDark;
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function snapshot() {
    return `${mode}|${resolvedTheme()}`;
}

/** React binding — re-renders on appearance change. */
export function useTheme() {
    useSyncExternalStore(subscribe, snapshot, () => "system|light");
    return {
        mode,
        resolved: resolvedTheme(),
        allowDark,
        setMode: setThemeMode,
        toggle: toggleTheme
    };
}
