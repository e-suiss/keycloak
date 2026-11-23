// @ts-nocheck

import { useState } from "react";
import { useT } from "../../ui/i18n";
import { Section, TextAction } from "../../ui/kit";
import { BackAction, FormActions, FormCard, KeyValueRows, TextField } from "./cp-ui";
import { fromAnnotationRows, toAnnotationRows } from "./up-attribute-form";

export default function UpGroupForm({ group, takenNames, onBack, onSave, onDelete }: any) {
    const t = useT();
    const editing = !!group;
    const [name, setName] = useState(group?.name ?? "");
    const [displayHeader, setDisplayHeader] = useState(group?.displayHeader ?? "");
    const [displayDescription, setDisplayDescription] = useState(group?.displayDescription ?? "");
    const [annotations, setAnnotations] = useState<any[]>(toAnnotationRows(group?.annotations));
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);

    const trimmed = name.trim();
    const nameError = !trimmed
        ? t("sxUserProfileEditorGroupNameRequired")
        : !editing && takenNames.includes(trimmed)
          ? t("sxUserProfileEditorGroupNameTaken")
          : "";

    const save = async () => {
        setTouched(true);
        if (nameError) return;
        setSaving(true);
        const next: any = {
            ...(group || {}),
            name: editing ? group.name : trimmed,
            displayHeader,
            displayDescription
        };
        const ann = fromAnnotationRows(annotations);
        if (Object.keys(ann).length) next.annotations = ann;
        else delete next.annotations;
        await onSave(next);
        setSaving(false);
    };

    return (
        <>
            <BackAction onClick={onBack}>{t("sxUserProfileEditorTabGroups")}</BackAction>
            <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">
                {editing ? group.name : t("sxUserProfileEditorCreateGroup")}
            </h2>
            <Section label={t("sxCommonGeneral")}>
                <FormCard>
                    <TextField
                        label={t("sxCommonName")}
                        hint={t("sxUserProfileEditorGroupNameHint")}
                        value={name}
                        onChange={setName}
                        disabled={editing}
                        mono
                        required
                        error={touched ? nameError : ""}
                    />
                    <TextField
                        label={t("sxUserProfileEditorDisplayHeader")}
                        hint={t("sxUserProfileEditorDisplayHeaderHint")}
                        value={displayHeader}
                        onChange={setDisplayHeader}
                    />
                    <TextField
                        label={t("sxUserProfileEditorDisplayDescription")}
                        hint={t("sxUserProfileEditorDisplayDescriptionHint")}
                        value={displayDescription}
                        onChange={setDisplayDescription}
                    />
                </FormCard>
            </Section>
            <Section label={t("sxUserProfileEditorAnnotations")}>
                <KeyValueRows rows={annotations} onChange={setAnnotations} />
            </Section>
            <div className="flex flex-col gap-4">
                <FormActions onSave={save} onCancel={onBack} saving={saving} saveLabel={editing ? undefined : t("sxCommonCreate")} />
                {onDelete && (
                    <div>
                        <TextAction tone="danger" onClick={onDelete}>
                            {t("sxUserProfileEditorDeleteGroup")}
                        </TextAction>
                    </div>
                )}
            </div>
        </>
    );
}
