// @ts-nocheck

import { Fragment, useState } from "react";
import { useT } from "../../ui/i18n";
import { Chip, GROUP, Notice, Section, SEPARATOR, TextAction } from "../../ui/kit";
import ComponentModal from "./cp-component-modal";
import {
    AddLabel,
    AreaField,
    BackAction,
    configSummary,
    ConfirmDialog,
    Footnote,
    FormActions,
    FormCard,
    ListRow,
    MultiPick,
    TextField,
    ToggleField
} from "./cp-ui";

export default function CpPolicyForm({
    policy,
    isGlobal,
    takenNames,
    conditionTypes,
    profileNames,
    onBack,
    onSave,
    onDelete
}: any) {
    const t = useT();
    const [name, setName] = useState(policy?.name ?? "");
    const [description, setDescription] = useState(policy?.description ?? "");
    const [enabled, setEnabled] = useState(policy ? policy.enabled !== false : true);
    const [conditions, setConditions] = useState<any[]>(policy?.conditions ?? []);
    const [profiles, setProfiles] = useState<string[]>(policy?.profiles ?? []);
    const [modal, setModal] = useState<any>(null);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);

    const trimmed = name.trim();
    const nameError = !trimmed
        ? t("sxClientPoliciesEditorNameRequired")
        : takenNames.includes(trimmed)
          ? t("sxClientPoliciesEditorNameTaken")
          : "";

    const save = async () => {
        setTouched(true);
        if (nameError) return;
        setSaving(true);
        const { global, ...base } = policy || {};
        await onSave({ ...base, name: trimmed, description, enabled, conditions, profiles });
        setSaving(false);
    };

    const removeCondition = (index: number) =>
        setConfirmOpts({
            title: t("sxClientPoliciesEditorRemoveConditionTitle"),
            message: t("sxClientPoliciesEditorRemoveConditionMessage", { name: conditions[index]?.condition }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: () => setConditions(list => list.filter((_, i) => i !== index))
        });

    return (
        <>
            <BackAction onClick={onBack}>{t("sxRealmSettingsPolicies")}</BackAction>
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">
                    {policy ? policy.name : t("sxClientPoliciesEditorCreatePolicy")}
                </h2>
                {isGlobal && <Chip>{t("sxRealmSettingsGlobal")}</Chip>}
            </div>
            {isGlobal && (
                <Notice
                    title={t("sxClientPoliciesEditorGlobalPolicyTitle")}
                    description={t("sxClientPoliciesEditorGlobalPolicyDescription")}
                />
            )}

            <Section label={t("sxCommonGeneral")}>
                <FormCard>
                    <TextField
                        label={t("sxCommonName")}
                        value={name}
                        onChange={setName}
                        disabled={isGlobal}
                        required
                        error={touched ? nameError : ""}
                    />
                    <AreaField label={t("sxCommonDescription")} value={description} onChange={setDescription} disabled={isGlobal} />
                    <ToggleField label={t("sxCommonEnabled")} checked={enabled} onChange={setEnabled} disabled={isGlobal} />
                </FormCard>
            </Section>

            <Section
                label={t("sxClientPoliciesEditorConditions")}
                action={
                    !isGlobal && (
                        <TextAction onClick={() => setModal({ index: -1 })}>
                            <AddLabel>{t("sxClientPoliciesEditorAddCondition")}</AddLabel>
                        </TextAction>
                    )
                }
            >
                {conditions.length === 0 ? (
                    <Notice
                        title={t("sxClientPoliciesEditorNoConditionsTitle")}
                        description={t("sxClientPoliciesEditorNoConditionsDescription")}
                    />
                ) : (
                    <ul className={GROUP}>
                        {conditions.map((c: any, i: number) => (
                            <Fragment key={`${c.condition}-${i}`}>
                                {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                <ListRow
                                    title={c.condition}
                                    subtitle={configSummary(c.configuration) || undefined}
                                    onOpen={() => setModal({ index: i })}
                                    trailing={
                                        !isGlobal && (
                                            <TextAction tone="danger" onClick={() => removeCondition(i)}>
                                                {t("sxCommonRemove")}
                                            </TextAction>
                                        )
                                    }
                                />
                            </Fragment>
                        ))}
                    </ul>
                )}
            </Section>

            <Section label={t("sxRealmSettingsProfiles")}>
                <FormCard>
                    <MultiPick
                        label={t("sxClientPoliciesEditorPolicyProfiles")}
                        hint={t("sxClientPoliciesEditorPolicyProfilesHint")}
                        selected={profiles}
                        options={profileNames}
                        onChange={setProfiles}
                        disabled={isGlobal}
                        placeholder={t("sxClientPoliciesEditorAddProfile")}
                    />
                </FormCard>
                {!isGlobal && <Footnote>{t("sxClientPoliciesEditorPolicyFootnote")}</Footnote>}
            </Section>

            {!isGlobal && (
                <div className="flex flex-col gap-4">
                    <FormActions onSave={save} onCancel={onBack} saving={saving} saveLabel={policy ? undefined : t("sxCommonCreate")} />
                    {onDelete && (
                        <div>
                            <TextAction tone="danger" onClick={onDelete}>
                                {t("sxClientPoliciesEditorDeletePolicy")}
                            </TextAction>
                        </div>
                    )}
                </div>
            )}

            {modal && (
                <ComponentModal
                    title={
                        modal.index >= 0
                            ? isGlobal
                                ? t("sxClientPoliciesEditorViewCondition")
                                : t("sxClientPoliciesEditorEditCondition")
                            : t("sxClientPoliciesEditorAddCondition")
                    }
                    typeLabel={t("sxClientPoliciesEditorConditionType")}
                    types={conditionTypes}
                    readOnly={isGlobal}
                    initial={
                        modal.index >= 0
                            ? { type: conditions[modal.index]?.condition, config: conditions[modal.index]?.configuration || {} }
                            : undefined
                    }
                    onClose={() => setModal(null)}
                    onSubmit={({ type, config }: any) => {
                        const item = { condition: type, configuration: config };
                        setConditions(list =>
                            modal.index >= 0 ? list.map((c, i) => (i === modal.index ? item : c)) : [...list, item]
                        );
                        setModal(null);
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </>
    );
}
