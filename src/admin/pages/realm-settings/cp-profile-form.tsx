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
    FormActions,
    Footnote,
    FormCard,
    ListRow,
    TextField
} from "./cp-ui";

export default function CpProfileForm({ profile, isGlobal, takenNames, executorTypes, onBack, onSave, onDelete }: any) {
    const t = useT();
    const [name, setName] = useState(profile?.name ?? "");
    const [description, setDescription] = useState(profile?.description ?? "");
    const [executors, setExecutors] = useState<any[]>(profile?.executors ?? []);
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
        const next = { ...(profile || {}), name: trimmed, description, executors };
        await onSave(next);
        setSaving(false);
    };

    const removeExecutor = (index: number) =>
        setConfirmOpts({
            title: t("sxClientPoliciesEditorRemoveExecutorTitle"),
            message: t("sxClientPoliciesEditorRemoveExecutorMessage", { name: executors[index]?.executor }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: () => setExecutors(list => list.filter((_, i) => i !== index))
        });

    return (
        <>
            <BackAction onClick={onBack}>{t("sxRealmSettingsProfiles")}</BackAction>
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">
                    {profile ? profile.name : t("sxClientPoliciesEditorCreateProfile")}
                </h2>
                {isGlobal && <Chip>{t("sxRealmSettingsGlobal")}</Chip>}
            </div>
            {isGlobal && <Notice title={t("sxClientPoliciesEditorGlobalProfileTitle")} description={t("sxClientPoliciesEditorGlobalProfileDescription")} />}

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
                </FormCard>
            </Section>

            <Section
                label={t("sxClientPoliciesEditorExecutors")}
                action={
                    !isGlobal && (
                        <TextAction onClick={() => setModal({ index: -1 })}>
                            <AddLabel>{t("sxClientPoliciesEditorAddExecutor")}</AddLabel>
                        </TextAction>
                    )
                }
            >
                {executors.length === 0 ? (
                    <Notice
                        title={t("sxClientPoliciesEditorNoExecutorsTitle")}
                        description={t("sxClientPoliciesEditorNoExecutorsDescription")}
                    />
                ) : (
                    <ul className={GROUP}>
                        {executors.map((ex: any, i: number) => (
                            <Fragment key={`${ex.executor}-${i}`}>
                                {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                <ListRow
                                    title={ex.executor}
                                    subtitle={configSummary(ex.configuration) || undefined}
                                    onOpen={() => setModal({ index: i })}
                                    trailing={
                                        !isGlobal && (
                                            <TextAction tone="danger" onClick={() => removeExecutor(i)}>
                                                {t("sxCommonRemove")}
                                            </TextAction>
                                        )
                                    }
                                />
                            </Fragment>
                        ))}
                    </ul>
                )}
                {!isGlobal && <Footnote>{t("sxClientPoliciesEditorExecutorsFootnote")}</Footnote>}
            </Section>

            {!isGlobal && (
                <div className="flex flex-col gap-4">
                    <FormActions onSave={save} onCancel={onBack} saving={saving} saveLabel={profile ? undefined : t("sxCommonCreate")} />
                    {onDelete && (
                        <div>
                            <TextAction tone="danger" onClick={onDelete}>
                                {t("sxClientPoliciesEditorDeleteProfile")}
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
                                ? t("sxClientPoliciesEditorViewExecutor")
                                : t("sxClientPoliciesEditorEditExecutor")
                            : t("sxClientPoliciesEditorAddExecutor")
                    }
                    typeLabel={t("sxClientPoliciesEditorExecutorType")}
                    types={executorTypes}
                    exclude={executors.map((e: any) => e.executor)}
                    readOnly={isGlobal}
                    initial={
                        modal.index >= 0
                            ? { type: executors[modal.index]?.executor, config: executors[modal.index]?.configuration || {} }
                            : undefined
                    }
                    onClose={() => setModal(null)}
                    onSubmit={({ type, config }: any) => {
                        const item = { executor: type, configuration: config };
                        setExecutors(list =>
                            modal.index >= 0 ? list.map((e, i) => (i === modal.index ? item : e)) : [...list, item]
                        );
                        setModal(null);
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </>
    );
}
