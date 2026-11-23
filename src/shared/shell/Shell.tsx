import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@ui/components/sheet";
import {
    createContext,
    type PropsWithChildren,
    type ReactNode,
    useContext,
    useMemo,
    useState
} from "react";

export const HAIRLINE = "border-[#e5e5ea] dark:border-[#38383a]";

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
