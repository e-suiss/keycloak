import type { PropsWithChildren } from "react";

type PageProps = {
    title: string;
    description?: string;
};

export const Page = ({ title, description, children }: PropsWithChildren<PageProps>) => {
    return (
        <div className="w-full px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-4xl">
                <h1
                    data-testid="page-heading"
                    className="mb-2 text-2xl font-semibold tracking-tight md:hidden"
                >
                    {title}
                </h1>
                {description && (
                    <p className="mb-6 max-w-2xl text-muted-foreground">
                        {description}
                    </p>
                )}
                {children}
            </div>
        </div>
    );
};
