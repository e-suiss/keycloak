const tile = (bg: string, shape: string) =>
    `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 92"><rect width="92" height="92" fill="${bg}"/><g transform="translate(31.5 31.5)">${shape}</g></svg>`
    )}`;

export const SECURITY_IMAGES: Record<string, string> = {
    circle: tile("#e3f0ff", '<circle cx="14.5" cy="14.5" r="11.4" fill="#0071e3"/>'),
    diamond: tile(
        "#e6f7ec",
        '<rect x="6" y="6" width="17" height="17" rx="3" fill="#34a853" transform="rotate(45 14.5 14.5)"/>'
    ),
    triangle: tile("#fff1e0", '<path d="M14.5 4 L25 24 L4 24 Z" fill="#ff9500"/>'),
    square: tile("#efe9ff", '<rect x="5" y="5" width="19" height="19" rx="4" fill="#5e5ce6"/>'),
    ring: tile(
        "#ffe9f1",
        '<circle cx="14.5" cy="14.5" r="9.3" fill="none" stroke="#ff2d55" stroke-width="6"/>'
    ),
    plus: tile(
        "#e2f6f4",
        '<path d="M14.5 5 V24 M5 14.5 H24" stroke="#2aa79b" stroke-width="5" stroke-linecap="round"/>'
    )
};

export function securityImageSrc(value?: string | null) {
    if (!value) return undefined;
    return SECURITY_IMAGES[value] ?? value;
}
