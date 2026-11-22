import { Button } from "@ui/components/button";
import type { ReactNode } from "react";

type Provider = {
    alias: string;
    providerId?: string;
    displayName: string;
    loginUrl: string;
    iconClasses?: string;
};

/** Brand marks keyed by a substring of the provider id / alias. */
const LOGOS: { match: string[]; node: ReactNode }[] = [
    {
        match: ["google"],
        node: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.98 10.98 0 001 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
            </svg>
        )
    },
    {
        match: ["microsoft"],
        node: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#F25022" d="M1 1h10v10H1z" />
                <path fill="#7FBA00" d="M13 1h10v10H13z" />
                <path fill="#00A4EF" d="M1 13h10v10H1z" />
                <path fill="#FFB900" d="M13 13h10v10H13z" />
            </svg>
        )
    },
    {
        match: ["facebook"],
        node: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38C19.61 22.95 24 17.99 24 12z" />
            </svg>
        )
    },
    {
        match: ["instagram"],
        node: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.4-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z" />
            </svg>
        )
    },
    {
        match: ["twitter", "x"],
        node: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.9 1.5h3.68l-8.04 9.19L24 22.5h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.5h7.59l5.24 6.93L18.9 1.5zm-1.29 18.8h2.04L6.49 3.6H4.3l13.31 16.7z" />
            </svg>
        )
    },
    {
        match: ["linkedin"],
        node: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z" />
            </svg>
        )
    },
    {
        match: ["stackoverflow", "stack-overflow"],
        node: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#BCBBBB" d="M6.77 14.32l8.78 1.83.37-1.76-8.78-1.84-.37 1.77zm1.16-4.2l8.14 3.78.75-1.62-8.14-3.8-.75 1.64zm2.25-3.99l6.9 5.74 1.13-1.36-6.9-5.74-1.13 1.36zM14.64 2l-1.44 1.07 5.35 7.2 1.44-1.07L14.64 2zM6.59 18.44h8.98v-1.8H6.59v1.8z" />
                <path fill="#F48024" d="M17.36 20.2v-5.38h1.79V22H3v-7.18h1.8v5.38h12.56z" />
            </svg>
        )
    },
    {
        match: ["github"],
        node: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0024 12.5C24 5.87 18.63.5 12 .5z" />
            </svg>
        )
    },
    {
        match: ["apple"],
        node: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
        )
    }
];

function logoFor(p: Provider): ReactNode {
    const key = `${p.providerId ?? ""} ${p.alias ?? ""}`.toLowerCase();
    const hit = LOGOS.find(l => l.match.some(m => key.includes(m)));
    if (hit) return hit.node;
    if (p.iconClasses) return <i className={p.iconClasses} aria-hidden="true" />;
    return null;
}

/**
 * Social login button: brand logo and "Continue with {Provider}" centered
 * together. Shared by the login and register pages.
 */
export function SocialButton({ provider, label }: { provider: Provider; label?: string }) {
    return (
        <Button
            variant="outline"
            size="form"
            block
            className="gap-2.5 font-medium dark:border-foreground/16 dark:bg-foreground/4 dark:hover:bg-foreground/8"
            asChild
        >
            <a id={`social-${provider.alias}`} href={provider.loginUrl}>
                <span className="flex size-4.5 items-center justify-center [&_svg]:size-4.5">{logoFor(provider)}</span>
                <span>{label ?? `${provider.displayName} ile devam et`}</span>
            </a>
        </Button>
    );
}
