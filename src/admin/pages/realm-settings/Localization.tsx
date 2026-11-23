// @ts-nocheck

import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Textarea } from "@ui/components/textarea";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import {
    GROUP,
    Group,
    ListSkeleton,
    Notice,
    Pager,
    SearchField,
    Section,
    TextAction
} from "../../ui/kit";
import { ConfirmDialog, FieldItem, Footnote, localeName } from "./fields";

const PAGE = 50;

function LocaleSelect({ value, onChange, locales, label }: any) {
    const { i18n } = useTranslation();
    const id = useId();
    return (
        <FieldItem label={label} htmlFor={id}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                value={value}
                onChange={(ev: any) => onChange(ev.target.value)}
            >
                {!locales.includes(value) && <NativeSelectOption value={value}>{value}</NativeSelectOption>}
                {locales.map((l: string) => (
                    <NativeSelectOption key={l} value={l}>
                        {localeName(l, i18n.language)}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FieldItem>
    );
}

export function RealmOverrides({ realm, locales, defaultLocale }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const all = locales.length ? locales : [defaultLocale || "en"];
    const [locale, setLocale] = useState(defaultLocale || all[0]);
    const [rows, setRows] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [confirm, setConfirm] = useState<any>(null);

    useEffect(() => {
        let alive = true;
        setRows(null);
        setFailed(false);
        setEditing(null);
        adminClient.realms
            .getRealmLocalizationTexts({ realm, selectedLocale: locale })
            .then((res: any) => {
                if (!alive) return;
                setRows(
                    Object.entries(res || {})
                        .map(([key, value]) => ({ key, value: String(value ?? "") }))
                        .sort((a, b) => a.key.localeCompare(b.key))
                );
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, locale, attempt]);

    useEffect(() => setPage(1), [query, locale]);

    const q = query.trim().toLowerCase();
    const filtered = useMemo(
        () =>
            (rows || []).filter(
                r => !q || r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)
            ),
        [rows, q]
    );
    const visible = filtered.slice((page - 1) * PAGE, page * PAGE);

    const saveEdit = async (key: string) => {
        setSavingKey(key);
        try {
            await adminClient.realms.addLocalization({ realm, selectedLocale: locale, key }, draft);
            setRows(prev => (prev || []).map(r => (r.key === key ? { ...r, value: draft } : r)));
            setEditing(null);
            addAlert(t("sxRealmSettingsTranslationUpdated"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsTranslationSaveError"), err);
        } finally {
            setSavingKey(null);
        }
    };

    const remove = (key: string) =>
        setConfirm({
            title: t("sxRealmSettingsTranslationDeleteTitle"),
            message: t("sxRealmSettingsTranslationDeleteMessage", { key }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.realms.deleteRealmLocalizationTexts({
                        realm,
                        selectedLocale: locale,
                        key
                    });
                    setRows(prev => (prev || []).filter(r => r.key !== key));
                    addAlert(t("sxRealmSettingsTranslationDeleted"), AlertVariant.success);
                } catch (err) {
                    addError(t("sxRealmSettingsTranslationDeleteError"), err);
                }
            }
        });

    const addAction = (
        <TextAction onClick={() => setAdding(true)}>
            <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
                <PlusIcon weight="bold" />
                {t("sxRealmSettingsAddTranslation")}
            </span>
        </TextAction>
    );

    return (
        <Section label={t("sxRealmSettingsRealmOverrides")} action={rows && addAction}>
            <div className="flex flex-col gap-3">
                <div className={`${GROUP} grid gap-4 p-4 sm:grid-cols-2`}>
                    <LocaleSelect
                        label={t("sxRealmSettingsLanguage")}
                        value={locale}
                        onChange={setLocale}
                        locales={all}
                    />
                    <FieldItem label={t("sxCommonSearch")}>
                        <SearchField
                            value={query}
                            onChange={setQuery}
                            placeholder={t("sxRealmSettingsSearchTranslations")}
                        />
                    </FieldItem>
                </div>
                {failed ? (
                    <Notice
                        title={t("sxRealmSettingsTranslationsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                ) : rows === null ? (
                    <ListSkeleton />
                ) : rows.length === 0 ? (
                    <Notice
                        title={t("sxRealmSettingsNoTranslationsTitle")}
                        description={t("sxRealmSettingsNoTranslationsDescription")}
                        action={<Button onClick={() => setAdding(true)}>{t("sxRealmSettingsAddTranslation")}</Button>}
                    />
                ) : filtered.length === 0 ? (
                    <Notice title={t("sxRealmSettingsNoSearchResults")} description={t("sxCommonTryDifferentSearch")} />
                ) : (
                    <>
                        <Group>
                            {visible.map(r => (
                                <li key={r.key} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <code className="min-w-0 font-mono text-[13px] font-medium [overflow-wrap:anywhere]">
                                            {r.key}
                                        </code>
                                        {editing !== r.key && (
                                            <div className="flex shrink-0 items-center gap-4">
                                                <TextAction
                                                    onClick={() => {
                                                        setEditing(r.key);
                                                        setDraft(r.value);
                                                    }}
                                                >
                                                    {t("sxRealmSettingsEdit")}
                                                </TextAction>
                                                <TextAction tone="danger" onClick={() => remove(r.key)}>
                                                    {t("sxCommonDelete")}
                                                </TextAction>
                                            </div>
                                        )}
                                    </div>
                                    {editing === r.key ? (
                                        <div className="mt-2 flex flex-col gap-2">
                                            <Textarea
                                                autoFocus
                                                rows={2}
                                                aria-label={t("sxCommonValue")}
                                                value={draft}
                                                onChange={(ev: any) => setDraft(ev.target.value)}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="plain" size="sm" onClick={() => setEditing(null)}>
                                                    {t("sxCommonCancel")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => saveEdit(r.key)}
                                                    disabled={savingKey === r.key}
                                                >
                                                    {savingKey === r.key ? t("sxCommonSaving") : t("sxCommonSave")}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-[15px] text-muted-foreground [overflow-wrap:anywhere]">
                                            {r.value || "—"}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </Group>
                        <Pager
                            page={page}
                            hasPrev={page > 1}
                            hasNext={page * PAGE < filtered.length}
                            onPrev={() => setPage(p => p - 1)}
                            onNext={() => setPage(p => p + 1)}
                        />
                    </>
                )}
            </div>
            <Footnote>{t("sxRealmSettingsRealmOverridesHint")}</Footnote>
            {adding && (
                <AddTranslationModal
                    realm={realm}
                    locale={locale}
                    onClose={() => setAdding(false)}
                    onAdded={(key: string, value: string) => {
                        setAdding(false);
                        setRows(prev =>
                            [...(prev || []).filter(r => r.key !== key), { key, value }].sort((a, b) =>
                                a.key.localeCompare(b.key)
                            )
                        );
                    }}
                />
            )}
            <ConfirmDialog opts={confirm} onClose={() => setConfirm(null)} />
        </Section>
    );
}

function AddTranslationModal({ realm, locale, onClose, onAdded }: any) {
    const t = useT();
    const { i18n } = useTranslation();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const keyId = useId();
    const valueId = useId();
    const [key, setKey] = useState("");
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const k = key.trim();
        if (!k) return;
        setBusy(true);
        try {
            await adminClient.realms.addLocalization({ realm, selectedLocale: locale, key: k }, value);
            addAlert(t("sxRealmSettingsTranslationAdded"), AlertVariant.success);
            onAdded(k, value);
        } catch (err) {
            addError(t("sxRealmSettingsTranslationSaveError"), err);
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxRealmSettingsAddTranslation")}</ModalTitle>
                    <ModalDescription>
                        {t("sxRealmSettingsAddTranslationDescription", { language: localeName(locale, i18n.language) })}
                    </ModalDescription>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                    <FieldItem label={t("sxCommonKey")} htmlFor={keyId}>
                        <Input
                            id={keyId}
                            size="lg"
                            className="font-mono data-[size=lg]:text-[15px]"
                            value={key}
                            onChange={(ev: any) => setKey(ev.target.value)}
                            placeholder="loginTitle"
                        />
                    </FieldItem>
                    <FieldItem label={t("sxCommonValue")} htmlFor={valueId}>
                        <Textarea id={valueId} rows={3} value={value} onChange={(ev: any) => setValue(ev.target.value)} />
                    </FieldItem>
                </ModalBody>
                <ModalFooter>
                    <Button variant="plain" onClick={onClose}>
                        {t("sxCommonCancel")}
                    </Button>
                    <Button onClick={save} disabled={busy || !key.trim()}>
                        {busy ? t("sxCommonAdding") : t("sxCommonAdd")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export function EffectiveMessageBundles({ realm, locales, defaultLocale, themeInfo }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const themeId = useId();
    const typeId = useId();
    const types = Object.keys(themeInfo || {}).sort();
    const [themeType, setThemeType] = useState(types.includes("login") ? "login" : types[0] || "");
    const themesForType = ((themeInfo || {})[themeType] || []).map((x: any) => x.name).filter(Boolean);
    const [theme, setTheme] = useState("");
    const all = locales.length ? locales : [defaultLocale || "en"];
    const [locale, setLocale] = useState(defaultLocale || all[0]);
    const [words, setWords] = useState("");
    const [filter, setFilter] = useState<any>(null);
    const [attempt, setAttempt] = useState(0);
    const [rows, setRows] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!themesForType.includes(theme)) setTheme(themesForType[0] || "");
    }, [themeType, themesForType.join(",")]);

    const fTheme = filter?.theme;
    const fType = filter?.themeType;
    const fLocale = filter?.locale;
    useEffect(() => {
        if (!fTheme || !fType || !fLocale) return;
        let alive = true;
        setRows(null);
        setFailed(false);
        setPage(1);
        adminClient.serverInfo
            .findEffectiveMessageBundles({ realm, theme: fTheme, themeType: fType, locale: fLocale, source: true })
            .then((res: any) => {
                if (!alive) return;
                setRows([...(res || [])].sort((a: any, b: any) => String(a.key).localeCompare(String(b.key))));
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, fTheme, fType, fLocale, attempt]);

    const terms = String(filter?.words || "")
        .split(/\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    const filtered = (rows || []).filter(
        (m: any) =>
            !terms.length ||
            terms.some(w => String(m.key).toLowerCase().includes(w) || String(m.value).toLowerCase().includes(w))
    );
    const visible = filtered.slice((page - 1) * PAGE, page * PAGE);

    const search = () => {
        setPage(1);
        setFilter({ theme, themeType, locale, words });
    };

    return (
        <Section label={t("sxRealmSettingsEffectiveBundles")}>
            <div className="flex flex-col gap-3">
                <div className={GROUP}>
                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                        <FieldItem label={t("sxRealmSettingsThemeType")} htmlFor={typeId}>
                            <NativeSelect
                                id={typeId}
                                size="lg"
                                className="w-full"
                                value={themeType}
                                onChange={(ev: any) => setThemeType(ev.target.value)}
                            >
                                {types.map(x => (
                                    <NativeSelectOption key={x} value={x}>
                                        {x}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </FieldItem>
                        <FieldItem label={t("sxRealmSettingsThemeSection")} htmlFor={themeId}>
                            <NativeSelect
                                id={themeId}
                                size="lg"
                                className="w-full"
                                value={theme}
                                onChange={(ev: any) => setTheme(ev.target.value)}
                            >
                                {themesForType.map((x: string) => (
                                    <NativeSelectOption key={x} value={x}>
                                        {x}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </FieldItem>
                        <LocaleSelect
                            label={t("sxRealmSettingsLanguage")}
                            value={locale}
                            onChange={setLocale}
                            locales={all}
                        />
                        <FieldItem label={t("sxRealmSettingsHasWords")}>
                            <SearchField
                                value={words}
                                onChange={setWords}
                                onEnter={search}
                                placeholder={t("sxRealmSettingsHasWordsPlaceholder")}
                            />
                        </FieldItem>
                    </div>
                    <div className="flex justify-end px-4 pb-4">
                        <Button onClick={search} disabled={!theme || !themeType || !locale}>
                            {t("sxCommonSearch")}
                        </Button>
                    </div>
                </div>
                {!filter ? (
                    <Notice
                        title={t("sxRealmSettingsEffectiveBundlesIdleTitle")}
                        description={t("sxRealmSettingsEffectiveBundlesIdleDescription")}
                    />
                ) : failed ? (
                    <Notice
                        title={t("sxRealmSettingsEffectiveBundlesLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                ) : rows === null ? (
                    <ListSkeleton />
                ) : filtered.length === 0 ? (
                    <Notice title={t("sxRealmSettingsNoSearchResults")} description={t("sxCommonTryDifferentSearch")} />
                ) : (
                    <>
                        <p className="px-0.5 text-[13px] text-muted-foreground">
                            {t("sxRealmSettingsResultsCount", { total: filtered.length })}
                        </p>
                        <Group>
                            {visible.map((m: any) => (
                                <li key={m.key} className="px-4 py-3">
                                    <code className="block font-mono text-[13px] font-medium [overflow-wrap:anywhere]">
                                        {m.key}
                                    </code>
                                    <p className="mt-1 text-[15px] text-muted-foreground [overflow-wrap:anywhere]">
                                        {m.value}
                                    </p>
                                </li>
                            ))}
                        </Group>
                        <Pager
                            page={page}
                            hasPrev={page > 1}
                            hasNext={page * PAGE < filtered.length}
                            onPrev={() => setPage(p => p - 1)}
                            onNext={() => setPage(p => p + 1)}
                        />
                    </>
                )}
            </div>
        </Section>
    );
}
