// @ts-nocheck

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@ui/components/toggle-group";
import { useTranslation } from "react-i18next";

/**
 * Dynamic config form driven by a Keycloak `properties` schema
 * (array of ConfigPropertyRepresentation).
 *
 * Config values live in `value` as `{ [name]: string[] }` (arrays of strings).
 * `onChange(name, string[])` updates a single key.
 */
export function ConfigForm({ properties, value, onChange }: any) {
    const { t } = useTranslation();
    const props = Array.isArray(properties) ? properties : [];
    const val = value || {};

    if (props.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Yapılandırma gerektirmiyor.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {props.map((p: any) => {
                const name = p?.name;
                if (!name) return null;
                const label = p.label ? t(p.label) : p.name;
                const cur = Array.isArray(val[name]) ? val[name] : undefined;

                let control: any;
                switch (p.type) {
                    case "boolean":
                        control = (
                            <Switch
                                id={`cfg-${name}`}
                                checked={(cur?.[0] ?? p.defaultValue) === "true"}
                                onCheckedChange={(v: boolean) => onChange(name, [String(v)])}
                            />
                        );
                        break;
                    case "List":
                        control = (
                            <Select
                                value={cur?.[0] ?? p.defaultValue ?? undefined}
                                onValueChange={(v: string) => onChange(name, [v])}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label={label}
                                    className="min-w-40"
                                >
                                    <SelectValue placeholder="Seçin" />
                                </SelectTrigger>
                                <SelectContent align="end" className="z-200">
                                    {(p.options || []).map((o: string) => (
                                        <SelectItem key={o} value={o}>
                                            {o}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        );
                        break;
                    case "MultivaluedList": {
                        const selected = Array.isArray(val[name]) ? val[name] : [];
                        control = (
                            (p.options || []).length === 0 ? (
                                <span className="text-sm text-muted-foreground">
                                    Seçenek yok.
                                </span>
                            ) : (
                                <ToggleGroup
                                    type="multiple"
                                    variant="outline"
                                    size="sm"
                                    className="flex-wrap"
                                    value={selected}
                                    onValueChange={(next: string[]) => {
                                        const added = next.find(
                                            (x: string) => !selected.includes(x)
                                        );
                                        onChange(
                                            name,
                                            added !== undefined
                                                ? [...selected, added]
                                                : selected.filter((x: string) =>
                                                      next.includes(x)
                                                  )
                                        );
                                    }}
                                >
                                    {(p.options || []).map((o: string) => (
                                        <ToggleGroupItem key={o} value={o}>
                                            {o}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            )
                        );
                        break;
                    }
                    case "MultivaluedString":
                        control = (
                            <Textarea
                                value={(Array.isArray(val[name]) ? val[name] : []).join(
                                    "\n"
                                )}
                                onChange={(e: any) =>
                                    onChange(
                                        name,
                                        String(e.target.value)
                                            .split("\n")
                                            .map((x: string) => x)
                                            .filter((x: string) => x.trim() !== "")
                                    )
                                }
                            />
                        );
                        break;
                    case "Password":
                        control = (
                            <Input
                                type="password"
                                value={cur?.[0] ?? p.defaultValue ?? ""}
                                onChange={(e: any) => onChange(name, [e.target.value])}
                            />
                        );
                        break;
                    case "Text":
                    case "Script":
                        control = (
                            <Textarea
                                value={cur?.[0] ?? p.defaultValue ?? ""}
                                onChange={(e: any) => onChange(name, [e.target.value])}
                            />
                        );
                        break;
                    default:
                        control = (
                            <Input
                                value={cur?.[0] ?? p.defaultValue ?? ""}
                                onChange={(e: any) => onChange(name, [e.target.value])}
                            />
                        );
                }

                // Booleans read best as a label-left / switch-right row (Apple settings style).
                if (p.type === "boolean") {
                    return (
                        <Field key={name} orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor={`cfg-${name}`}>
                                    {label}
                                    {p.required && <span className="text-destructive"> *</span>}
                                </FieldLabel>
                                {p.helpText && (
                                    <FieldDescription>{t(p.helpText)}</FieldDescription>
                                )}
                            </FieldContent>
                            {control}
                        </Field>
                    );
                }

                return (
                    <Field key={name}>
                        <FieldLabel>
                            {label}
                            {p.required && <span className="text-destructive"> *</span>}
                        </FieldLabel>
                        {control}
                        {p.helpText && <FieldDescription>{t(p.helpText)}</FieldDescription>}
                    </Field>
                );
            })}
        </div>
    );
}

export default ConfigForm;
