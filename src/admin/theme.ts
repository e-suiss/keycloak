// Appearance manager for the admin console.
// Light / Dark / System, toggled with the `d` hotkey, persisted to
// localStorage, applied via PatternFly's `pf-v5-theme-dark` class.
import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "wallet-admin-theme";
// globals.css drives dark mode via the `.dark` class now (PatternFly is gone).
const DARK_CLASS = "dark";

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

    // Replace the flash-guard style injected by early-color-scheme.js.
    document.getElementById("root-color-scheme-style")?.remove();
    const el = document.createElement("style");
    el.id = "root-color-scheme-style";
    el.innerHTML = `:root { color-scheme: ${dark ? "dark" : "light"}; }`;
    document.head.appendChild(el);
    root.style.removeProperty("background-color");

    root.classList.toggle(DARK_CLASS, dark);
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
