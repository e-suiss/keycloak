import { SignOutIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";

export type AppearanceMode = "light" | "dark" | "system";

export interface NavUserProps {
    name: string;
    email?: string;
    /** Current appearance; with onModeChange, shows the appearance choice. */
    mode?: AppearanceMode;
    onModeChange?: (mode: AppearanceMode) => void;
    appearanceLabel?: string;
    /** Shows a sign-out item when provided. */
    onSignOut?: () => void;
    signOutLabel?: string;
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join("");
}

const MODES: { value: AppearanceMode; label: string }[] = [
    { value: "light", label: "Açık" },
    { value: "dark", label: "Koyu" },
    { value: "system", label: "Sistem" }
];

/** Account menu for app headers, built from the esuiss DropdownMenu and Avatar. */
export function NavUser({
    name,
    email,
    mode,
    onModeChange,
    appearanceLabel = "Görünüm",
    onSignOut,
    signOutLabel = "Çıkış yap"
}: NavUserProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label={name}>
                    <Avatar>
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-3">
                    <Avatar size="lg">
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-foreground">{name}</p>
                        {email && <p className="truncate font-normal">{email}</p>}
                    </div>
                </DropdownMenuLabel>
                {mode && onModeChange && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>{appearanceLabel}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={mode}
                                onValueChange={value => onModeChange(value as AppearanceMode)}
                            >
                                {MODES.map(option => (
                                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                                        {option.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuGroup>
                    </>
                )}
                {onSignOut && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
                            <SignOutIcon />
                            {signOutLabel}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
