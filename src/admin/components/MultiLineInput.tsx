// @ts-nocheck
// Keycloak-style "MultiLineInput": a list of single-value rows you add/remove
// one at a time (used for redirect URIs, web origins, post-logout URIs, …).
// shadcn/tailwind primitives — no PatternFly.
import { useState } from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";

const seed = (value: string[]) => {
    const arr = Array.isArray(value) ? value.filter((x: any) => x != null) : [];
    return arr.length ? [...arr] : [""];
};

export function MultiLineInput({ value, onChange, placeholder, addLabel }: any) {
    const [rows, setRows] = useState<string[]>(() => seed(value));

    const emit = (next: string[]) => {
        setRows(next.length ? next : [""]);
        onChange?.(next.map((s: string) => (s ?? "").trim()).filter(Boolean));
    };

    const update = (i: number, val: string) =>
        emit(rows.map((r, j) => (j === i ? val : r)));

    const removeRow = (i: number) => {
        const next = rows.filter((_, j) => j !== i);
        emit(next.length ? next : [""]);
    };

    const canAdd = (rows[rows.length - 1] ?? "").trim() !== "";
    const addRow = () => {
        if (canAdd) emit([...rows, ""]);
    };

    return (
        <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                    <Input
                        value={row ?? ""}
                        placeholder={placeholder}
                        onChange={(e: any) => update(i, e.target.value)}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Satırı kaldır"
                        onClick={() => removeRow(i)}
                    >
                        <XIcon />
                    </Button>
                </div>
            ))}
            <div>
                <Button
                    variant="plain"
                    size="sm"
                    disabled={!canAdd}
                    onClick={addRow}
                >
                    <PlusIcon data-icon="inline-start" />
                    {addLabel}
                </Button>
            </div>
        </div>
    );
}
