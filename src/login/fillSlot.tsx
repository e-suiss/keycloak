import { Fragment, type ReactNode } from "react";

/** Puts a node (a link, an emphasized value) where "{0}" sits in a translated sentence. */
export function fillSlot(template: string, node: ReactNode): ReactNode {
    const [before, ...rest] = template.split("{0}");
    if (rest.length === 0) return template;
    return (
        <>
            {before}
            {rest.map((after, i) => (
                <Fragment key={i}>
                    {node}
                    {after}
                </Fragment>
            ))}
        </>
    );
}
