// Phosphor nav icons for the account console — same icon set/style as web/admin.
import {
    BuildingsIcon,
    CircleIcon,
    DevicesIcon,
    FolderIcon,
    HandshakeIcon,
    type Icon,
    IdentificationCardIcon,
    LinkIcon,
    ShieldCheckIcon,
    SignInIcon,
    SquaresFourIcon,
    UserIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";

const ICONS: Record<string, Icon> = {
    personalInfo: UserIcon,
    consents: HandshakeIcon,
    accountSecurity: ShieldCheckIcon,
    signingIn: SignInIcon,
    deviceActivity: DevicesIcon,
    linkedAccounts: LinkIcon,
    applications: SquaresFourIcon,
    groups: UsersThreeIcon,
    organizations: BuildingsIcon,
    resources: FolderIcon,
    oid4vci: IdentificationCardIcon
};

export function NavIcon({
    name,
    active,
    className
}: {
    name: string;
    active?: boolean;
    className?: string;
}) {
    const Icon = ICONS[name] ?? CircleIcon;
    return <Icon weight={active ? "fill" : "regular"} className={className} />;
}
