// @ts-nocheck
// PatternFly-free replacement for the keycloak typeaheadMulti SelectControl —
// a chip toggle group bound to react-hook-form.

import { CheckIcon } from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "@ui/components/toggle-group";
import { Controller } from "react-hook-form";
import type { Scope } from "../api/representations";

export const scopeName = (s: Scope | string) => (typeof s === "string" ? s : s.name);

const scopeLabel = (s: Scope) => s.displayName || s.name;

type ScopePickerProps = {
    control: any;
    name: string;
    scopes: Scope[];
    id?: string;
};

export function ScopePicker({ control, name, scopes, id }: ScopePickerProps) {
    return (
        <Controller
            control={control}
            name={name}
            defaultValue={[]}
            render={({ field }) => {
                const selected: string[] = (field.value || []).map(scopeName);
                return (
                    <ToggleGroup
                        id={id}
                        type="multiple"
                        variant="outline"
                        size="sm"
                        className="flex-wrap"
                        value={selected}
                        onValueChange={(next: string[]) => field.onChange(next)}
                    >
                        {scopes.map(scope => (
                            <ToggleGroupItem
                                key={scope.name}
                                value={scope.name}
                                className="h-7.5 rounded-full border-[#d2d2d7] px-3 text-[13px] font-medium aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:hover:bg-primary/15 aria-pressed:hover:text-primary dark:border-[#48484a]"
                            >
                                {selected.includes(scope.name) && <CheckIcon />}
                                {scopeLabel(scope)}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                );
            }}
        />
    );
}
