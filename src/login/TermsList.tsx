import { Button } from "@ui/components/button";
import { FieldError } from "@ui/components/field";
import { ScrollArea } from "@ui/components/scroll-area";
import { Switch } from "@ui/components/switch";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useState } from "react";
import type { Term } from "./KcContext";

type Props = {
    terms: Term[];
    checked: Record<string, boolean>;
    onCheckedChange: (key: string, value: boolean) => void;
    acceptLabel: string;
    error?: string;
    className?: string;
};

/**
 * The admin-managed terms as a list of "title · switch" rows (design: registration identity step).
 * The title opens the full text; a term marked mustRead can only be switched on after its text was
 * scrolled to the end. Each accepted term posts `term_<key>=<version>`.
 */
export function TermsList(props: Props) {
    const { terms, checked, onCheckedChange, acceptLabel, error, className } = props;

    const [read, setRead] = useState<Record<string, boolean>>({});
    const [open, setOpen] = useState<string | null>(null);

    const markRead = (key: string) => setRead(r => (r[key] ? r : { ...r, [key]: true }));

    const toggle = (t: Term) => {
        if (t.mustRead && !read[t.key] && !checked[t.key]) {
            setOpen(t.key);
            return;
        }
        onCheckedChange(t.key, !checked[t.key]);
    };

    // Read means scrolled to the end, or nothing to scroll at all.
    const checkScrolledToEnd = (t: Term, el: HTMLElement | null) => {
        if (el === null || !t.mustRead || read[t.key]) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) markRead(t.key);
    };

    const openTerm = terms.find(t => t.key === open);

    return (
        <div className={`flex flex-col gap-3.25 ${className ?? ""}`}>
            {terms.map(t => (
                <div key={t.key} className="flex items-center justify-between gap-2.75 text-left">
                    <button
                        type="button"
                        onClick={() => setOpen(t.key)}
                        className="min-w-0 cursor-pointer text-left text-[13px] leading-[1.45] text-primary hover:underline"
                    >
                        {t.title}
                    </button>
                    {checked[t.key] && <input type="hidden" name={`term_${t.key}`} value={t.version || "1"} />}
                    <Switch checked={!!checked[t.key]} onCheckedChange={() => toggle(t)} aria-label={t.title} />
                </div>
            ))}
            {error && (
                <FieldError aria-live="polite" className="-mt-1 ps-0.5 text-left">
                    {error}
                </FieldError>
            )}

            <Modal open={openTerm !== undefined} onOpenChange={o => !o && setOpen(null)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{openTerm?.title}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {openTerm && (
                            <ScrollArea
                                ref={(el: HTMLDivElement | null) =>
                                    checkScrolledToEnd(openTerm, el?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]") ?? null)
                                }
                                onScrollCapture={e => checkScrolledToEnd(openTerm, e.target as HTMLElement)}
                                className="[&>[data-slot=scroll-area-viewport]]:max-h-[55vh]"
                            >
                                <div
                                    className="pe-3 text-sm leading-relaxed [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:font-semibold [&_p]:mb-2 [&_p]:text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: openTerm.content }}
                                />
                            </ScrollArea>
                        )}
                    </ModalBody>
                    {openTerm && (
                        <ModalFooter>
                            <Button
                                type="button"
                                size="form"
                                block
                                disabled={openTerm.mustRead && !read[openTerm.key]}
                                onClick={() => {
                                    markRead(openTerm.key);
                                    onCheckedChange(openTerm.key, true);
                                    setOpen(null);
                                }}
                            >
                                {acceptLabel}
                            </Button>
                        </ModalFooter>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
