import type { PropsWithChildren } from "react";

type PageProps = {
    title: string;
    description?: string;
};

export const Page = ({ title, description, children }: PropsWithChildren<PageProps>) => {
    return (
        <div className="flex justify-center px-7.5 pt-6 pb-10 sm:px-10 sm:py-14">
            <div className="flex w-full max-w-110 flex-col items-center text-center">
                <h1
                    data-testid="page-heading"
                    className="mt-6.5 text-[28px] font-semibold tracking-[-0.02em]"
                >
                    {title}
                </h1>
                {description && (
                    <p className="mt-2 text-base leading-[1.45] text-muted-foreground">
                        {description}
                    </p>
                )}
                <div className="mt-6.5 w-full text-left">{children}</div>
            </div>
        </div>
    );
};
