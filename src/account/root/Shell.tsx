import { Sidebar, SidebarInset, SidebarProvider } from "@ui/components/sidebar";
import type { PropsWithChildren, ReactNode } from "react";

type ShellProps = {
    header: ReactNode;
    sidebar: ReactNode;
};

/** App frame built on the shared Sidebar primitives. */
export function Shell({ header, sidebar, children }: PropsWithChildren<ShellProps>) {
    return (
        <SidebarProvider>
            <Sidebar>{sidebar}</Sidebar>
            <SidebarInset>
                {header}
                <main>{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
