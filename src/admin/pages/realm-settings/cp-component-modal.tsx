// @ts-nocheck

import { Button } from "@ui/components/button";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useState } from "react";
import { useT } from "../../ui/i18n";
import { ConfigFields, defaultConfig, SelectField, tr } from "./cp-ui";

export default function ComponentModal({
    title,
    typeLabel,
    types,
    exclude,
    initial,
    readOnly,
    onClose,
    onSubmit,
    submitLabel
}: any) {
    const t = useT();
    const editing = !!initial?.type;
    const [type, setType] = useState(initial?.type ?? "");
    const [config, setConfig] = useState<any>(initial?.config ?? {});
    const all = types || [];
    const options = all
        .filter((c: any) => editing || !(exclude || []).includes(c.id))
        .map((c: any) => ({ value: c.id, label: c.id }));
    const selected = all.find((c: any) => c.id === type);
    const properties = selected?.properties || [];

    const pick = (id: string) => {
        setType(id);
        const next = all.find((c: any) => c.id === id);
        setConfig(defaultConfig(next?.properties || []));
    };

    const submit = () => {
        if (!type) return;
        const names = properties.map((p: any) => p.name).filter(Boolean);
        const out: any = editing ? { ...config } : {};
        names.forEach((n: string) => {
            if (config[n] !== undefined) out[n] = config[n];
        });
        onSubmit({ type, config: out });
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-xl">
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                    {selected?.helpText && <ModalDescription>{tr(t, selected.helpText)}</ModalDescription>}
                </ModalHeader>
                <ModalBody className="max-h-[60vh] overflow-y-auto">
                    <div className="flex flex-col gap-5 py-1">
                        <SelectField
                            label={typeLabel}
                            value={type}
                            disabled={editing}
                            options={options}
                            onChange={pick}
                        />
                        {selected && (
                            <ConfigFields properties={properties} value={config} onChange={setConfig} disabled={readOnly} />
                        )}
                        {!selected && type && <p className="px-0.5 text-[15px] text-muted-foreground">{t("sxClientPoliciesEditorUnknownType")}</p>}
                    </div>
                </ModalBody>
                <ModalFooter>
                    {readOnly ? (
                        <Button type="button" onClick={onClose}>
                            {t("sxCommonClose")}
                        </Button>
                    ) : (
                        <>
                            <Button type="button" variant="plain" onClick={onClose}>
                                {t("sxCommonCancel")}
                            </Button>
                            <Button type="button" onClick={submit} disabled={!type}>
                                {submitLabel ?? (editing ? t("sxCommonSave") : t("sxCommonAdd"))}
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
