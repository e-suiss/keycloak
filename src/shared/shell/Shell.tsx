import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@ui/components/sheet";
import { cn } from "@ui/lib/utils";
import {
    createContext,
    type PropsWithChildren,
    type ReactNode,
    useContext,
    useMemo,
    useState
} from "react";

export const HAIRLINE = "border-[#e5e5ea] dark:border-[#38383a]";

export function navLinkClass(isActive: boolean) {
    return cn(
        "mt-0.5 flex h-8.5 items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        isActive
            ? "bg-[#e5e5ea] font-medium dark:bg-[#2c2c2e]"
            : "hover:bg-[#e5e5ea]/60 dark:hover:bg-[#2c2c2e]/60"
    );
}

export function NavBrandBar({ title, suffix }: { title: string; suffix: string }) {
    return (
        <div
            data-testid="page-header"
            className={`-mx-3 mb-3.5 flex h-12 shrink-0 items-center gap-2 border-b px-5.5 sm:h-15 ${HAIRLINE}`}
        >
            <span aria-hidden className="size-5.5 shrink-0 rounded-full bg-muted-foreground" />
            <span className="text-base font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">{suffix}</span>
        </div>
    );
}

type NavDrawer = { open: boolean; setOpen: (open: boolean) => void };

const NavDrawerContext = createContext<NavDrawer>({ open: false, setOpen: () => {} });

export const useNavDrawer = () => useContext(NavDrawerContext);

type ShellProps = {
    header: ReactNode;
    sidebar: ReactNode;
    menuLabel: string;
};

export function Shell({ header, sidebar, menuLabel, children }: PropsWithChildren<ShellProps>) {
    const [open, setOpen] = useState(false);
    const drawer = useMemo(() => ({ open, setOpen }), [open]);

    return (
        <NavDrawerContext.Provider value={drawer}>
            <div className="min-h-svh bg-background text-foreground">
                <div className="mx-auto flex min-h-svh w-full max-w-[1248px]">
                    <aside
                        className={`sticky top-0 hidden h-svh w-60 shrink-0 flex-col overflow-y-auto border-e px-3 pb-5 sm:flex ${HAIRLINE}`}
                    >
                        {sidebar}
                    </aside>
                    <div className="flex min-w-0 flex-1 flex-col">
                        {header}
                        <main className="flex-1 overflow-x-hidden">{children}</main>
                    </div>
                </div>
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="left"
                    showCloseButton={false}
                    className={`rounded-none border-e bg-background px-3 pb-5 shadow-none data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-[290px] data-[side=left]:max-w-[85vw] data-[side=left]:sm:max-w-[85vw] ${HAIRLINE}`}
                >
                    <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
                    <SheetDescription className="sr-only">{menuLabel}</SheetDescription>
                    {sidebar}
                </SheetContent>
            </Sheet>
        </NavDrawerContext.Provider>
    );
}
